import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useLobbySyncStore } from '../store/useLobbySyncStore'
import { useResultsStore } from '../store/useResultsStore'
import { serverNow } from '../time/serverClock'
import type { VideoErrorRoundInfo } from '../screens/VideoErrorRound'
import { LOBBY_RETURN_OFFSET_MS, rouletteDrawPhaseAt } from './lobbyTimeline'

export interface DrawInProgress {
  drawNo: string
  drawStartMs: number
  result: number | null
}

// La máquina arrancó (o se reconectó) con un sorteo de Roulette en pantalla en las demás (ver
// lobbyTimeline). No salta al medio del clip (cada máquina tiene el suyo, aleatorio): muestra el mismo
// panel que cuando el video no carga (VideoErrorRound, pedido explícito) -- RESULT IN hasta el instante
// en que las demás revelan el número, el resultado, y la salida a la misma hora absoluta que ellas. Si
// el sorteo ya estaba saliendo (rueda bajando), "Sincronizando…" el segundo que falta hasta el lobby.
// Devuelve la limpieza de su timer.
export function joinDrawInProgress(draw: DrawInProgress, showErrorRound: (round: VideoErrorRoundInfo) => void): () => void {
  const { drawStartMs, result } = draw
  const phase = rouletteDrawPhaseAt(serverNow(), drawStartMs)
  if (phase === 'lobby') return () => {}
  if (phase === 'exit') {
    useLobbySyncStore.getState().holdUntil(drawStartMs + LOBBY_RETURN_OFFSET_MS)
    return () => {}
  }
  console.log(`[sync] entrando con el sorteo ${draw.drawNo} en curso (${phase}) -- panel de video no disponible`)

  // El resultado entra al historial cuando el panel llega al final de la ventana del video, como en
  // las demás. Si el backend ya lo liquidó, /gameInfo history ya lo trae como ganador actual: se saca y
  // se vuelve a agregar en ese momento, para no duplicarlo.
  const { currentWinner, history } = useResultsStore.getState()
  if (currentWinner?.drawNumber === draw.drawNo && currentWinner.timestamp === drawStartMs) {
    useResultsStore.getState().hydrateHistory(history)
  }

  // Mismo arranque de ronda que App (startTimer) cuando el video no cargó.
  const start = () => {
    const cycle = useDrawCycleStore.getState()
    cycle.setDrawStartMs(drawStartMs)
    if (result !== null) cycle.setPendingResult({ drawNo: draw.drawNo, result })
    cycle.setActive(true)
    cycle.setLobbyInfoVisible(false)
    cycle.setWinnerPanelNumber(null)
    cycle.setWinnerPanelExiting(false)
    showErrorRound({ drawStartMs, result })
  }

  // Los ~2s entre la ejecución del sorteo en el backend y su hora programada: las demás todavía están
  // en el lobby, así que esta también espera (con "Sincronizando…") y arranca a la misma hora.
  const msUntilStart = drawStartMs - serverNow()
  if (msUntilStart <= 0) {
    start()
    return () => {}
  }
  useLobbySyncStore.getState().holdUntil(drawStartMs)
  const timer = setTimeout(start, msUntilStart)
  return () => clearTimeout(timer)
}
