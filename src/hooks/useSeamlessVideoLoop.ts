import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { loadVideoSrc } from '../video/videoElements'
import { notifyWheelVideoSwap } from '../video/wheelVideoActive'
import { onVideoNearEnd, onVideoPlaybackStable } from '../utils/videoSeek'

interface UseSeamlessVideoLoopOptions {
  enabled: boolean
  url: string | undefined
  frozen: boolean
  leadSeconds?: number
}

interface UseSeamlessVideoLoopResult {
  videoRefA: RefObject<HTMLVideoElement | null>
  videoRefB: RefObject<HTMLVideoElement | null>
}

// Cuánto tiempo se deja reproduciendo a B (oculto) durante el precalentamiento único al montar --
// ver el comentario en el sitio de uso. Empírico, no hay una fórmula detrás del valor exacto.
const WARM_UP_PLAY_MS = 1000

// Doble buffer para esconder el micro-freeze de Chromium al reiniciar un <video loop> nativo --
// confirmado como bug genérico de Chromium (aparece incluso con un .mp4 plano sin alpha, suelto
// en una pestaña, sin nada de esta app de por medio), no un problema de nuestro encode ni de
// Pixi. En vez de loop=true nativo, alterna entre dos <video> idénticos: el visible NUNCA hace el
// reinicio -- el que está oculto sí lo hace, y recién se revela una vez que probó estar pintando
// frames reales estables (ver onVideoPlaybackStable en utils/videoSeek.ts).
//
// data-wheel-video-active en el DOM (no un valor de React) es la fuente de verdad de "cuál es el
// visible ahora" para los consumidores que buscan .lobby-wheel-video por selector
// (useWheelVideoRigidRotationSync/useWheelVideoPocketGeometry/WheelFrameStepper) -- no hace falta
// exponer un índice reactivo desde acá: nada en el árbol de React depende de cuál está activo, así
// que el swap se hace con mutación DOM directa (misma lógica de costo que useWheelVideoRigidRotationSync).
//
// El contenido es un loop continuo (la rueda sigue girando) y el standby siempre arranca desde
// currentTime=0 -- el corte solo queda invisible si el standby se ARRANCA y se REVELA los dos casi
// en el mismo instante en que el activo llega a su final real. Se probó separar "cuándo arranca" de
// "cuándo se revela" (arrancarlo generoso y recién revelar pegado al final del activo) esperando
// que eso redujera el salto -- resultó exactamente al revés: como el standby queda reproduciendo
// SIN revelarse durante todo ese margen, para cuando se revela ya avanzó esa misma cantidad de
// frames desde su propio 0, así que el salto termina siendo del tamaño del margen generoso (peor
// que antes). La conclusión: arrancar y revelar tienen que ser UN SOLO evento, disparado lo más
// cerca posible del final real del activo -- leadSeconds define ambas cosas a la vez, y por eso
// tiene que ser chico (el margen real que hace falta es solo lo que tarda
// onVideoPlaybackStable en confirmar el standby, 2 frames reales, ~30-60ms -- ya con el pipeline
// de decode precalentado, ver más abajo). Como red de seguridad, si el activo llega a su 'ended'
// real (loop=false, se congela ahí) antes de que el standby confirme estabilidad, se fuerza el
// swap igual -- un standby sin confirmar del todo es preferible a un freeze indefinido.
export function useSeamlessVideoLoop({ enabled, url, frozen, leadSeconds = 0.08 }: UseSeamlessVideoLoopOptions): UseSeamlessVideoLoopResult {
  const videoRefA = useRef<HTMLVideoElement>(null)
  const videoRefB = useRef<HTMLVideoElement>(null)
  const activeIndexRef = useRef<0 | 1>(0)
  const unsubscribeNearEndRef = useRef<(() => void) | null>(null)
  const unsubscribeStableRef = useRef<(() => void) | null>(null)
  const unsubscribeWarmUpRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!enabled || !url) return
    const videoA = videoRefA.current
    const videoB = videoRefB.current
    if (!videoA || !videoB) return

    let cancelled = false
    videoA.loop = false
    videoB.loop = false

    function playWithMutedFallback(video: HTMLVideoElement) {
      video.play().catch(() => {
        video.muted = true
        void video.play()
      })
    }

    function applySwap(newActiveIndex: 0 | 1) {
      const newActive = newActiveIndex === 0 ? videoA : videoB
      const newInactive = newActiveIndex === 0 ? videoB : videoA
      newActive.style.opacity = '1'
      newActive.setAttribute('data-wheel-video-active', 'true')
      newInactive.style.opacity = '0'
      newInactive.setAttribute('data-wheel-video-active', 'false')
      newInactive.pause()
      activeIndexRef.current = newActiveIndex
      // Avisa a los consumidores por-frame (useWheelVideoPocketGeometry/useWheelVideoRigidRotationSync)
      // que el elemento activo cambió -- si se quedaran suscriptos al que acaba de pausarse, su
      // requestVideoFrameCallback dejaría de disparar y se congelarían justo en este instante.
      notifyWheelVideoSwap()
    }

    function scheduleNearEnd(activeVideo: HTMLVideoElement) {
      unsubscribeNearEndRef.current?.()
      unsubscribeNearEndRef.current = onVideoNearEnd(activeVideo, handleNearEnd, leadSeconds)
    }

    function handleNearEnd() {
      if (cancelled) return
      const standbyIndex: 0 | 1 = activeIndexRef.current === 0 ? 1 : 0
      const standby = standbyIndex === 0 ? videoA : videoB
      const activeVideo = activeIndexRef.current === 0 ? videoA : videoB

      standby.currentTime = 0
      playWithMutedFallback(standby)

      let swapped = false
      function finishSwap() {
        if (swapped || cancelled) return
        swapped = true
        activeVideo.removeEventListener('ended', finishSwap)
        applySwap(standbyIndex)
        scheduleNearEnd(standby)
      }

      // Red de seguridad: si el activo llega a su final real (loop=false, así que se congela ahí)
      // antes de que onVideoPlaybackStable confirme el standby, fuerza el swap igual -- un standby
      // sin confirmar del todo es preferible a dejar el activo congelado esperando indefinidamente.
      activeVideo.addEventListener('ended', finishSwap)

      unsubscribeStableRef.current?.()
      const unsubscribeStable = onVideoPlaybackStable(standby, finishSwap)
      unsubscribeStableRef.current = () => {
        unsubscribeStable()
        activeVideo.removeEventListener('ended', finishSwap)
      }
    }

    const loads = frozen ? [loadVideoSrc(videoA, url)] : [loadVideoSrc(videoA, url), loadVideoSrc(videoB, url)]

    Promise.all(loads).then(() => {
      if (cancelled) return
      if (frozen) {
        // Calibración (WheelFrameStepper): video B nunca se carga ni se toca -- comportamiento
        // pixel-idéntico al de antes de este cambio. Video A queda pausado en frame 0;
        // WheelFrameStepper maneja currentTime por su cuenta desde ahí.
        videoA.pause()
        videoA.currentTime = 0
        videoA.style.opacity = '1'
        return
      }

      activeIndexRef.current = 0
      videoA.style.opacity = '0'
      videoB.style.opacity = '0'

      // Arranque inicial tratado igual que un swap (oculto -> confirmar estable -> recién ahí
      // revelar) en vez de reproducir A directamente ya visible -- evita mostrar en pantalla el
      // costo de "arranque en frío" del pipeline de decode del primer play() de un video recién
      // cargado (mismo costo que un reinicio, solo que la primera vez que le toca a ese elemento).
      playWithMutedFallback(videoA)
      unsubscribeStableRef.current?.()
      const unsubscribeInitialStable = onVideoPlaybackStable(videoA, () => {
        if (cancelled) return
        applySwap(0)
        scheduleNearEnd(videoA)
      })
      unsubscribeStableRef.current = unsubscribeInitialStable

      // Precalienta el pipeline de decode de B mientras sigue oculto. A diferencia de un reinicio
      // real (2 frames alcanzan para confirmar estabilidad), acá se lo deja reproduciendo un rato
      // más (WARM_UP_PLAY_MS) antes de pausarlo -- A llega a su primer swap con ~7s de reproducción
      // real continua encima; confirmar apenas 2 frames y pausar de inmediato no le da a B ese
      // mismo asentamiento, así que su primer swap real seguía notándose distinto de los
      // siguientes (una vez que B también acumuló un ciclo completo real de por medio). Es un
      // costo de doble-decode único, acotado a este ratito al montar -- no se repite en ciclos
      // posteriores (para entonces cada elemento ya tuvo su propio turno real completo).
      let warmUpTimeout: ReturnType<typeof setTimeout> | undefined
      playWithMutedFallback(videoB)
      unsubscribeWarmUpRef.current?.()
      const unsubscribeWarmUpStable = onVideoPlaybackStable(videoB, () => {
        if (cancelled) return
        warmUpTimeout = setTimeout(() => {
          if (cancelled) return
          videoB.pause()
          videoB.currentTime = 0
        }, WARM_UP_PLAY_MS)
      })
      unsubscribeWarmUpRef.current = () => {
        unsubscribeWarmUpStable()
        clearTimeout(warmUpTimeout)
      }
    })

    return () => {
      cancelled = true
      unsubscribeNearEndRef.current?.()
      unsubscribeNearEndRef.current = null
      unsubscribeStableRef.current?.()
      unsubscribeStableRef.current = null
      unsubscribeWarmUpRef.current?.()
      unsubscribeWarmUpRef.current = null
      videoA.pause()
      videoB.pause()
    }
  }, [enabled, url, frozen, leadSeconds])

  return { videoRefA, videoRefB }
}
