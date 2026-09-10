import { useEffect, useLayoutEffect, useState } from 'react'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useResultsStore } from '../store/useResultsStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useAnimatedProgress } from '../hooks/useAnimatedProgress'
import { RESULT_HOLD_MS, VIDEO_WHEEL_TRANSITION_DURATION_MS, WINNER_PANEL_LEAD_SECONDS } from '../layout/layout.constants'
import { easeInOutCubic } from '../utils/easing'
import { DRAW_VIDEO_SLOT_ID, getVideoSlot, loadVideoSrc, resetVideoSlot } from '../video/videoElements'
import { onVideoNearEnd } from '../utils/videoSeek'

interface RouletteVideoViewProps {
  // Se llama recién cuando el video termina de bajar de vuelta a su posición
  // de partida (no cuando termina de reproducirse — eso solo arranca el hold).
  onFullyExited?: () => void
  // Se llama apenas el video termina de reproducirse (evento 'ended'), antes del
  // freeze-hold/slide-down -- justo cuando este componente se oculta (handedOff), sin
  // esperar a que termine esa animación.
  onEnded?: () => void
}

// El video real vive en el pool de <video> del DOM (VideoPoolLayer, montado como hermano de
// <Application> en App.tsx) y se pinta directamente ahí -- ya no pasa por Pixi/WebGL (ni
// pixiSprite ni textura). Estos .webm traen canal alfa real (alpha_mode:1) y Chromium lo
// compone solo en un <video> normal (ver project_video_pipeline en memoria) -- así que además
// de evitar la subida de textura extra por frame, la transparencia real se sigue viendo.
// Este componente sigue montado dentro del árbol de Pixi únicamente para poder usar
// useAnimatedProgress (depende del ticker de Pixi) como reloj de la animación de entrada/salida
// -- no pinta nada en el canvas, devuelve null.
export function RouletteVideoView({ onFullyExited, onEnded }: RouletteVideoViewProps) {
  const videoUrlFromStore = useGameConfigStore((state) => state.videoUrl)
  const [ready, setReady] = useState(false)
  // true desde el evento 'ended' en adelante — este componente deja de pintarse (opacity:0,
  // revelando el fondo de LobbyBackgroundLayer detrás), aunque el hold/slide-down internos
  // sigan corriendo (siguen siendo necesarios para disparar onFullyExited).
  const [handedOff, setHandedOff] = useState(false)
  const active = useDrawCycleStore((state) => state.active)
  // progress 0 = oculto abajo de la pantalla, 1 = en su posición final mostrándose.
  // Sube cuando active pasa a true, y baja cuando vuelve a false — el mismo cálculo
  // sirve para la entrada y, en reversa, para la salida.
  const progress = useAnimatedProgress(active ? 1 : 0, VIDEO_WHEEL_TRANSITION_DURATION_MS)
  const eased = easeInOutCubic(progress)
  const arrived = active && progress === 1
  const fullyExited = !active && progress === 0

  // Publica el mismo progreso ya-easeado que posiciona este video para que LobbyBackgroundLayer
  // (fuera del árbol de Pixi, no puede usar useAnimatedProgress) mueva la rueda del lobby en
  // sync -- ver useDrawCycleStore.videoSlideProgress. Sin gating por `ready`: existe desde el
  // instante en que `active` cambia, igual que `progress`.
  useLayoutEffect(() => {
    useDrawCycleStore.getState().setVideoSlideProgress(eased)
  }, [eased])

  useEffect(() => {
    if (!videoUrlFromStore) return

    let cancelled = false
    setReady(false)
    const video = getVideoSlot(DRAW_VIDEO_SLOT_ID)
    video.loop = false

    loadVideoSrc(video, videoUrlFromStore).then(() => {
      if (!cancelled) setReady(true)
    })

    return () => {
      cancelled = true
      resetVideoSlot(video)
    }
  }, [videoUrlFromStore])

  useEffect(() => {
    if (!ready) return

    const video = getVideoSlot(DRAW_VIDEO_SLOT_ID)

    let holdTimer: ReturnType<typeof setTimeout> | undefined

    function handleEnded() {
      const pendingResult = useDrawCycleStore.getState().pendingResult
      if (pendingResult) {
        useResultsStore.getState().addResult({
          id: pendingResult.drawNo,
          timestamp: Date.now(),
          drawNumber: pendingResult.drawNo,
          winningNumber: pendingResult.result,
        })
        useDrawCycleStore.getState().setPendingResult(null)
      } else {
        console.error('El video terminó sin un resultado real pendiente (drawResult no llegó a tiempo).')
      }

      // Deja el último frame congelado un rato (el resultado visible) antes de
      // disparar la bajada del video y el regreso de RouletteLobby.
      holdTimer = setTimeout(() => {
        useDrawCycleStore.getState().setActive(false)
      }, RESULT_HOLD_MS)
    }

    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('ended', handleEnded)
      clearTimeout(holdTimer)
    }
  }, [ready])

  // Dispara el hand-off visual (ocultar este video, avisar al caller para revelar el lobby) tan
  // cerca como sea posible del último frame REAL pintado -- separado del 'ended' de arriba
  // porque la ruleta sigue girando a velocidad casi constante hasta ese frame (nunca frena en
  // cámara), así que cualquier demora extra esperando el evento 'ended' se ve como un salto de
  // varios grados. Ver onVideoNearEnd en utils/videoSeek.ts.
  useEffect(() => {
    if (!ready) return
    const video = getVideoSlot(DRAW_VIDEO_SLOT_ID)
    return onVideoNearEnd(video, () => {
      setHandedOff(true)
      onEnded?.()
    })
  }, [ready, onEnded])

  // Captura el número ganador para el panel Winner (WinnerPanel.tsx) apenas quedan
  // WINNER_PANEL_LEAD_SECONDS del video -- no puede leer pendingResult en el momento en que el
  // panel debe desaparecer porque el 'ended' de handleEnded ya lo limpió para entonces (bastante
  // antes: el panel sigue en pantalla durante el hold + la bajada de la rueda). Registro
  // independiente del hand-off de arriba (mismo video, otro leadSeconds -- ver onVideoNearEnd).
  useEffect(() => {
    if (!ready) return
    const video = getVideoSlot(DRAW_VIDEO_SLOT_ID)
    return onVideoNearEnd(video, () => {
      const pendingResult = useDrawCycleStore.getState().pendingResult
      if (pendingResult) useDrawCycleStore.getState().setWinnerPanelNumber(pendingResult.result)
    }, WINNER_PANEL_LEAD_SECONDS)
  }, [ready])

  // Recién arranca a reproducirse una vez que termina de subir a su posición final.
  useEffect(() => {
    if (!ready || !arrived) return

    const video = getVideoSlot(DRAW_VIDEO_SLOT_ID)
    // El kiosco corre sin interacción de usuario, así que el navegador puede bloquear el
    // autoplay con sonido — si play() es rechazado por esa política, reintenta mudo para que
    // el video se siga mostrando (ver flag --autoplay-policy=no-user-gesture-required en el
    // lanzador del kiosco para que el audio realmente suene en producción).
    video.play().catch(() => {
      video.muted = true
      void video.play()
    })
  }, [ready, arrived])

  // Avisa recién cuando terminó de bajar de vuelta, para que App desmonte este
  // componente y programe el siguiente sorteo.
  useEffect(() => {
    if (!fullyExited) return
    resetVideoSlot(getVideoSlot(DRAW_VIDEO_SLOT_ID))
    onFullyExited?.()
  }, [fullyExited, onFullyExited])

  // Posiciona el <video> real del pool a mano: translateY(100%) lo deja empujado fuera de
  // pantalla por su propio alto (mismo <video> es position:fixed, 100vw/100vh, ver
  // videoPool.css), y translateY(0) es su posición final en pantalla — mismo cálculo que antes
  // hacía el pixiSprite con screenHeight/scale, pero en porcentaje, sin depender del canvas de
  // diseño. La opacidad, a diferencia de la posición, se apaga de un salto (no anima) apenas
  // handedOff — el caller ya reveló el loop de lobby por encima — igual que antes hacía
  // `visible={!handedOff}` en el pixiSprite; el hold/slide-down interno sigue corriendo (para
  // eventualmente disparar onFullyExited) aunque ya no se vea.
  useLayoutEffect(() => {
    if (!ready) return
    const video = getVideoSlot(DRAW_VIDEO_SLOT_ID)
    video.style.display = 'block'
    video.style.opacity = handedOff ? '0' : '1'
    video.style.transform = `translateY(${(1 - eased) * 100}%)`
  }, [ready, eased, handedOff])

  return null
}
