import { useEffect, useState } from 'react'
import { useLobbyModeStore } from '../store/useLobbyModeStore'
import { publishPendingDraw } from '../hooks/useQuickMoneyLobbyCycle'
import { QUICK_MONEY_VIDEO_SLOT_ID, getVideoSlot, hideVideoSlot, preloadQuickMoneyVideo } from '../video/videoElements'
import { QUICK_MONEY_VIDEO_FADE_MS } from '../config/quickMoneyLobbyCycle'
import { QUICK_MONEY_VIDEO_END_OFFSET_MS } from '../sync/lobbyTimeline'
import { serverNow } from '../time/serverClock'
import { VideoErrorPanel, type VideoErrorResult } from './VideoErrorPanel'

interface VideoFallback {
  result: VideoErrorResult | null
  // En Quick Money la revelación ES el final del video: el camino normal publica el resultado
  // (publishPendingDraw) recién después de 'ended', y no hay un momento de revelación anterior
  // conocido (el backend no lo informa). Así que revelación y continuación son el mismo instante y
  // el panel nunca muestra CONTINUING IN -- revela y sale en ese mismo instante, igual que el video
  // (sin hold, pedido explícito): la pantalla de resultado que sigue muestra los mismos números.
  endedAtIso: string
}

// Video del sorteo de Quick Money -- montado solo durante la fase 'quickMoneyVideo' (ver
// useQuickMoneyLobbyCycle, que además lo corta si el bloque de Quick Money se queda sin tiempo).
// Mismo criterio que RouletteVideoView: el <video> real vive en el pool del DOM (VideoPoolLayer, slot propio QUICK_MONEY_VIDEO_SLOT_ID), nunca pasa por Pixi. A
// diferencia de Roulette entra/sale con un fade (sin slide) y no necesita el ticker de Pixi, así que
// es un componente DOM común montado fuera de <Application>.
//
// Secuencia: carga -> fade in -> play -> fin del clip -> fade out -> publica el resultado en la tabla
// y pasa a 'quickMoneyResult'. Sin hold después del clip (pedido explícito): el video ya termina
// mostrando los números, así que se pasa al resultado apenas termina. Todo anclado a la hora programada del
// sorteo (pendingDraw.drawnAt) con el reloj del servidor, no al 'ended' de esta máquina: el clip dura
// siempre lo mismo (QUICK_MONEY_VIDEO_DURATION_MS), así que todas las máquinas pasan al resultado a la
// vez (sync/lobbyTimeline.ts); y si esta máquina montó la vista unos ms tarde, el clip arranca
// adelantado esa diferencia. Si el video no está (no llegó a tiempo) o no carga, muestra
// VideoErrorPanel: RESULT IN durante lo que habría durado el video y, al llegar a 0, revela y sale a la
// misma hora que el video en las demás máquinas. Es también lo que ve una máquina que llegó tarde al
// video (ver useQuickMoneyLobbyCycle).
const SEEK_MIN_LAG_S = 0.25

export function QuickMoneyVideoView() {
  const [fallback, setFallback] = useState<VideoFallback | null>(null)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const video = getVideoSlot(QUICK_MONEY_VIDEO_SLOT_ID)
    const drawnAt = useLobbyModeStore.getState().pendingDraw?.drawnAt
    // Hora programada del sorteo: el clip arranca ahí (con su fade in) en todas las máquinas.
    const drawAtMs = drawnAt ? new Date(drawnAt).getTime() : serverNow()
    let cancelled = false
    let finished = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const at = (timestampMs: number, fn: () => void) => timers.push(setTimeout(fn, Math.max(0, timestampMs - serverNow())))

    function complete() {
      if (finished || cancelled) return
      finished = true
      video.style.opacity = '0'
      // Con el fallback en pantalla, el panel sale con su escala a 0 (misma duración que el fade).
      setExiting(true)
      timers.push(
        setTimeout(() => {
          publishPendingDraw()
          useLobbyModeStore.getState().setPhase('quickMoneyResult')
        }, QUICK_MONEY_VIDEO_FADE_MS)
      )
    }

    function showFallback() {
      const endedAt = drawAtMs + QUICK_MONEY_VIDEO_END_OFFSET_MS
      const pendingDraw = useLobbyModeStore.getState().pendingDraw
      setFallback({
        // Capturado acá: publishPendingDraw limpia pendingDraw recién al final, pero el panel no
        // depende de ese momento.
        result: pendingDraw ? { game: 'quickMoney', pick3: pendingDraw.pick3Result, pick4: pendingDraw.pick4Result } : null,
        endedAtIso: new Date(endedAt).toISOString(),
      })
      at(endedAt, complete)
    }

    video.loop = false
    // Salida apenas termina el clip: con su 'ended' o, si no llega (decode colgado), a la hora en que
    // termina en todas las máquinas -- lo que pase primero. Los clips arrancan alineados (seek de
    // abajo), así que el 'ended' de cada máquina cae casi en el mismo instante.
    video.addEventListener('ended', complete)

    // Ya viene precargado entero (blob descargado ~2:30 antes del sorteo, ver
    // video/quickMoneyTestVideo.ts), así que esto resuelve al instante.
    const videoUrl = useLobbyModeStore.getState().pendingVideoUrl
    const ready = videoUrl ? preloadQuickMoneyVideo(videoUrl) : Promise.reject(new Error('el sorteo no tiene video'))
    ready
      .then(() => {
        if (cancelled) return
        // Montada unos ms tarde respecto de la hora del sorteo (polling del ciclo): el clip se adelanta
        // lo mismo. Por debajo de SEEK_MIN_LAG_S no vale el seek.
        const lagS = (serverNow() - drawAtMs) / 1000
        video.currentTime = lagS > SEEK_MIN_LAG_S ? Math.min(lagS, video.duration || lagS) : 0
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
        at(drawAtMs + QUICK_MONEY_VIDEO_END_OFFSET_MS, complete)
      })
      .catch((err) => {
        console.error('No se pudo cargar el video de Quick Money -- se muestra el panel de video no disponible', err)
        if (cancelled) return
        showFallback()
      })

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      video.removeEventListener('ended', complete)
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
