import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useLobbySyncStore } from '../store/useLobbySyncStore'
import { useResultsStore } from '../store/useResultsStore'
import { commitPendingResult } from '../store/commitPendingResult'
import { serverNow } from '../time/serverClock'
import { pickRandomDrawResultVideoUrl } from '../utils/media'
import { easeInOutCubic } from '../utils/easing'
import { VIDEO_WHEEL_TRANSITION_DURATION_MS } from '../layout/layout.constants'
import { DRAW_VIDEO_SLOT_ID, getVideoSlot, loadVideoSrc, resetVideoSlot } from '../video/videoElements'
import {
  RESULT_HOLD_END_OFFSET_MS,
  LOBBY_RETURN_OFFSET_MS,
  VIDEO_WINDOW_END_OFFSET_MS,
  WINNER_EXIT_OFFSET_MS,
  rouletteDrawPhaseAt,
} from './lobbyTimeline'

export interface DrawInProgress {
  drawNo: string
  drawStartMs: number
  result: number | null
}

// Último frame del clip del resultado, para que el panel Winner tenga el mismo fondo que en las demás
// máquinas (WinnerPanel lo captura del slot del video al aparecer). Si no llega, el panel sale igual
// sin ese fondo.
async function prepareLastFrame(result: number): Promise<void> {
  const video = getVideoSlot(DRAW_VIDEO_SLOT_ID)
  await loadVideoSrc(video, await pickRandomDrawResultVideoUrl(result))
  await new Promise<void>((resolve, reject) => {
    video.addEventListener('seeked', () => resolve(), { once: true })
    video.addEventListener('error', () => reject(new Error('seek del último frame falló')), { once: true })
    video.currentTime = Math.max(0, video.duration - 0.05)
  })
}

// Bajada de la rueda del lobby (mismo progreso que publicaría RouletteVideoView al retirarse el
// video): al llegar a 0 el rotor se destraba desde el ángulo 0, igual que en las demás máquinas.
function slideWheelDown(): () => void {
  const startedAt = performance.now()
  let frame = requestAnimationFrame(function step(now) {
    const progress = Math.max(0, 1 - (now - startedAt) / VIDEO_WHEEL_TRANSITION_DURATION_MS)
    useDrawCycleStore.getState().setVideoSlideProgress(easeInOutCubic(progress))
    if (progress > 0) frame = requestAnimationFrame(step)
  })
  return () => cancelAnimationFrame(frame)
}

// La máquina arrancó con un sorteo de Roulette en pantalla en las demás (ver lobbyTimeline). No salta
// al medio del clip (cada máquina tiene el suyo, aleatorio): "Sincronizando…" hasta que termina la
// ventana del video y entra directo al panel Winner, que sale a la misma hora que en las demás. Si ya
// estaba saliendo, espera a que el lobby vuelva. Devuelve la limpieza de sus timers.
export function joinDrawInProgress(draw: DrawInProgress): () => void {
  const { drawStartMs, result } = draw
  const phase = rouletteDrawPhaseAt(serverNow(), drawStartMs)
  if (phase === 'lobby') return () => {}

  const sync = useLobbySyncStore.getState()
  if (phase === 'exit' || result === null) {
    sync.holdUntil(drawStartMs + LOBBY_RETURN_OFFSET_MS)
    return () => {}
  }
  sync.holdUntil(drawStartMs + VIDEO_WINDOW_END_OFFSET_MS)
  console.log(`[sync] entrando con el sorteo ${draw.drawNo} en curso (${phase})`)

  const cycle = useDrawCycleStore.getState()
  cycle.setDrawStartMs(drawStartMs)
  cycle.setLobbyInfoVisible(false)
  // Igual que en las demás máquinas: rueda arriba (fuera de escena) y rotor congelado en el ángulo 0.
  cycle.setVideoSlideProgress(1)
  // El resultado entra al historial cuando termina la ventana del video, como en las demás. Si el
  // backend ya lo liquidó, /gameInfo history ya lo trae como ganador actual: se saca y se vuelve a
  // agregar en ese momento -- si no, el panel Winner (que antepone su número a los recientes) lo
  // mostraría repetido.
  const { currentWinner, history } = useResultsStore.getState()
  if (currentWinner?.drawNumber === draw.drawNo && currentWinner.timestamp === drawStartMs) {
    useResultsStore.getState().hydrateHistory(history)
  }
  cycle.setPendingResult({ drawNo: draw.drawNo, result })

  prepareLastFrame(result).catch((err) => console.warn('[sync] sin último frame para el panel Winner', err))

  const timers: ReturnType<typeof setTimeout>[] = []
  const at = (timestampMs: number, fn: () => void) => timers.push(setTimeout(fn, Math.max(0, timestampMs - serverNow())))
  let stopSlide = () => {}

  at(drawStartMs + VIDEO_WINDOW_END_OFFSET_MS, () => {
    useDrawCycleStore.getState().setWinnerPanelNumber(result)
  })
  at(drawStartMs + RESULT_HOLD_END_OFFSET_MS, () => {
    // El commit va bastante DESPUÉS del número, como en RouletteVideoView (2s): WinnerPanel arma su
    // fila de recientes en un efecto, con el historial ANTERIOR. El historial sigue oculto hasta
    // que vuelve la info del lobby, así que no se nota la diferencia con las demás máquinas.
    if (useDrawCycleStore.getState().pendingResult) commitPendingResult()
    stopSlide = slideWheelDown()
  })
  at(drawStartMs + WINNER_EXIT_OFFSET_MS, () => {
    // WinnerPanel termina su salida y vuelve a mostrar la info del lobby.
    useDrawCycleStore.getState().setWinnerPanelExiting(true)
    resetVideoSlot(getVideoSlot(DRAW_VIDEO_SLOT_ID))
  })

  return () => {
    timers.forEach(clearTimeout)
    stopSlide()
  }
}
