import { useEffect } from 'react'
import { useLobbyModeStore } from '../store/useLobbyModeStore'
import { publishPendingDraw } from '../hooks/useQuickMoneyLobbyCycle'
import { QUICK_MONEY_VIDEO_SLOT_ID, getVideoSlot, hideVideoSlot, preloadQuickMoneyVideo } from '../video/videoElements'
import {
  QUICK_MONEY_VIDEO_FADE_MS,
  QUICK_MONEY_VIDEO_HOLD_MS,
  QUICK_MONEY_VIDEO_MAX_MS,
} from '../config/quickMoneyLobbyCycle'

// Video del sorteo de Quick Money -- montado solo durante la fase 'quickMoneyVideo' (ver
// useQuickMoneyLobbyCycle, que además lo corta si el bloque de Quick Money se queda sin tiempo).
// Mismo criterio que RouletteVideoView: el <video> real vive en el pool del DOM (VideoPoolLayer, slot propio QUICK_MONEY_VIDEO_SLOT_ID), nunca pasa por Pixi. A
// diferencia de Roulette entra/sale con un fade (sin slide) y no necesita el ticker de Pixi, así que
// es un componente DOM común montado fuera de <Application>.
//
// Secuencia: carga -> fade in -> play -> 'ended' -> hold sobre el último frame -> fade out ->
// publica el resultado en la tabla y pasa a 'quickMoneyResult'. Cualquier falla (carga o un video
// que nunca termina) salta directo al final, para que el lobby nunca quede clavado acá.
export function QuickMoneyVideoView() {
  useEffect(() => {
    const video = getVideoSlot(QUICK_MONEY_VIDEO_SLOT_ID)
    let cancelled = false
    let finished = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms))

    function complete() {
      if (finished || cancelled) return
      finished = true
      video.style.opacity = '0'
      later(() => {
        publishPendingDraw()
        useLobbyModeStore.getState().setPhase('quickMoneyResult')
      }, QUICK_MONEY_VIDEO_FADE_MS)
    }

    function handleEnded() {
      later(complete, QUICK_MONEY_VIDEO_HOLD_MS)
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
        console.error('No se pudo cargar el video de Quick Money', err)
        complete()
      })

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      video.removeEventListener('ended', handleEnded)
      // Oculta y rebobina sin soltar el src: queda cargado para el próximo sorteo.
      hideVideoSlot(video)
    }
  }, [])

  return null
}
