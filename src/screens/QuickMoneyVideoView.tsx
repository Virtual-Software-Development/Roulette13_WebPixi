import { useEffect, useState } from 'react'
import { useLobbyModeStore } from '../store/useLobbyModeStore'
import { publishPendingDraw } from '../hooks/useQuickMoneyLobbyCycle'
import { QUICK_MONEY_VIDEO_SLOT_ID, getVideoSlot, hideVideoSlot, preloadQuickMoneyVideo } from '../video/videoElements'
import {
  QUICK_MONEY_VIDEO_FADE_MS,
  QUICK_MONEY_VIDEO_FALLBACK_DURATION_MS,
  QUICK_MONEY_VIDEO_HOLD_MS,
  QUICK_MONEY_VIDEO_MAX_MS,
} from '../config/quickMoneyLobbyCycle'
import { VideoErrorPanel, type VideoErrorResult } from './VideoErrorPanel'

interface VideoFallback {
  result: VideoErrorResult | null
  // En Quick Money la revelación ES el final del video: el camino normal publica el resultado
  // (publishPendingDraw) recién después de 'ended', y no hay un momento de revelación anterior
  // conocido (el backend no lo informa). Así que revelación y continuación son el mismo instante y
  // el panel nunca muestra CONTINUING IN -- revela y queda con el resultado durante el hold.
  endedAtIso: string
}

// Video del sorteo de Quick Money -- montado solo durante la fase 'quickMoneyVideo' (ver
// useQuickMoneyLobbyCycle, que además lo corta si el bloque de Quick Money se queda sin tiempo).
// Mismo criterio que RouletteVideoView: el <video> real vive en el pool del DOM (VideoPoolLayer, slot propio QUICK_MONEY_VIDEO_SLOT_ID), nunca pasa por Pixi. A
// diferencia de Roulette entra/sale con un fade (sin slide) y no necesita el ticker de Pixi, así que
// es un componente DOM común montado fuera de <Application>.
//
// Secuencia: carga -> fade in -> play -> 'ended' -> hold sobre el último frame -> fade out ->
// publica el resultado en la tabla y pasa a 'quickMoneyResult'. Si el video no está (no llegó a
// tiempo) o no carga, muestra VideoErrorPanel: RESULT IN durante lo que habría durado el video, el
// resultado al llegar a 0, y sigue por el mismo 'ended' -> hold -> salida. Un video que nunca termina salta directo al final
// (QUICK_MONEY_VIDEO_MAX_MS), para que el lobby nunca quede clavado acá.
export function QuickMoneyVideoView() {
  const [fallback, setFallback] = useState<VideoFallback | null>(null)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const video = getVideoSlot(QUICK_MONEY_VIDEO_SLOT_ID)
    // Ancla del countdown del fallback: el video habría arrancado ahora (+ su fade in).
    const startedAt = Date.now()
    let cancelled = false
    let finished = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms))

    function complete() {
      if (finished || cancelled) return
      finished = true
      video.style.opacity = '0'
      // Con el fallback en pantalla, el panel sale con su escala a 0 (misma duración que el fade).
      setExiting(true)
      later(() => {
        publishPendingDraw()
        useLobbyModeStore.getState().setPhase('quickMoneyResult')
      }, QUICK_MONEY_VIDEO_FADE_MS)
    }

    function handleEnded() {
      later(complete, QUICK_MONEY_VIDEO_HOLD_MS)
    }

    function showFallback() {
      const endedAt = startedAt + QUICK_MONEY_VIDEO_FADE_MS + QUICK_MONEY_VIDEO_FALLBACK_DURATION_MS
      const pendingDraw = useLobbyModeStore.getState().pendingDraw
      setFallback({
        // Capturado acá: publishPendingDraw limpia pendingDraw recién al final, pero el panel no
        // depende de ese momento.
        result: pendingDraw ? { game: 'quickMoney', pick3: pendingDraw.pick3Result, pick4: pendingDraw.pick4Result } : null,
        endedAtIso: new Date(endedAt).toISOString(),
      })
      // Al llegar el countdown a 0 sigue exactamente como si el video hubiera terminado.
      later(handleEnded, Math.max(0, endedAt - Date.now()))
    }

    video.loop = false
    video.addEventListener('ended', handleEnded)
    later(complete, QUICK_MONEY_VIDEO_MAX_MS)

    // Ya viene precargado entero (blob descargado ~2:30 antes del sorteo, ver
    // video/quickMoneyTestVideo.ts), así que esto resuelve al instante.
    const videoUrl = useLobbyModeStore.getState().pendingVideoUrl
    const ready = videoUrl ? preloadQuickMoneyVideo(videoUrl) : Promise.reject(new Error('el sorteo no tiene video'))
    ready
      .then(() => {
        if (cancelled) return
        video.currentTime = 0
        video.style.display = 'block'
        // Fuerza el layout con opacity:0 antes de subirla -- recién salido de display:none, sin esto
        // el navegador aplica el 1 directo y la transition del fade in no corre.
        void video.offsetWidth
        video.style.opacity = '1'
        // Mismo fallback que RouletteVideoView: el kiosco no tiene interacción de usuario, así que
        // si el autoplay con sonido es bloqueado se reintenta mudo.
        video.play().catch(() => {
          video.muted = true
          void video.play()
        })
      })
      .catch((err) => {
        console.error('No se pudo cargar el video de Quick Money -- se muestra el panel de video no disponible', err)
        if (cancelled) return
        showFallback()
      })

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      video.removeEventListener('ended', handleEnded)
      // Oculta y rebobina sin soltar el src: queda cargado para el próximo sorteo.
      hideVideoSlot(video)
    }
  }, [])

  if (!fallback) return null
  return (
    <VideoErrorPanel
      result={fallback.result}
      revealAtIso={fallback.endedAtIso}
      continueAtIso={fallback.endedAtIso}
      exiting={exiting}
      backdrop="plain"
    />
  )
}
