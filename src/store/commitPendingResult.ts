import { useDrawCycleStore } from './useDrawCycleStore'
import { useResultsStore } from './useResultsStore'
import { serverNow } from '../time/serverClock'

// Pasa el resultado del sorteo en curso (pendingResult) al historial -- en el instante en que
// termina el video (RouletteVideoView, evento 'ended') o en el que habría terminado si no cargó
// (VideoErrorRound). Compartido para que las dos vías registren la ronda exactamente igual.
export function commitPendingResult(): void {
  const pendingResult = useDrawCycleStore.getState().pendingResult
  if (!pendingResult) {
    console.error('El video terminó sin un resultado real pendiente (drawResult no llegó a tiempo).')
    return
  }
  // Hora programada del sorteo (igual en todas las máquinas y la misma que trae /gameInfo history),
  // no el instante local en que terminó el clip -- los clips duran distinto en cada máquina.
  const timestamp = useDrawCycleStore.getState().drawStartMs ?? serverNow()
  useResultsStore.getState().addResult({
    // drawNo alone isn't a safe id/React key -- see the same comment in applyGameInfo.ts
    // (the backend resets it every calendar day).
    id: `${timestamp}-${pendingResult.drawNo}`,
    timestamp,
    drawNumber: pendingResult.drawNo,
    winningNumber: pendingResult.result,
  })
  useDrawCycleStore.getState().setPendingResult(null)
}
