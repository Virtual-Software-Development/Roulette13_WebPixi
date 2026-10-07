import { useEffect, useState } from 'react'
import { VideoErrorPanel } from './VideoErrorPanel'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { commitPendingResult } from '../store/commitPendingResult'
import { RESULT_HOLD_MS, VIDEO_WHEEL_TRANSITION_DURATION_MS, WINNER_PANEL_EXIT_DURATION_MS } from '../layout/layout.constants'

export interface VideoErrorRoundInfo {
  // Hora programada del sorteo (/gameInfo nextDraw.startTime, en ms) -- ancla de toda la línea de
  // tiempo, igual para todas las máquinas.
  drawStartMs: number
  // Duración del video que se iba a mostrar (ver video/videoDuration.ts).
  videoDurationMs: number
  nextRoundStartIso: string
}

interface VideoErrorRoundProps {
  round: VideoErrorRoundInfo
  // Mismo contrato que RouletteVideoView: onEnded en el instante en que el video habría terminado
  // (App agenda ahí el próximo sorteo), onFinished cuando el panel ya salió y el lobby volvió.
  onEnded: () => void
  onFinished: () => void
}

// Reemplaza a RouletteVideoView cuando el video del sorteo no cargó (ver App.tsx). Muestra
// VideoErrorPanel y repite, con timers, la MISMA secuencia que el camino normal -- subida del video,
// reproducción, hold sobre el resultado, bajada y salida del panel Winner -- pero contada desde la
// hora programada del sorteo y no desde que el panel apareció: así, aunque la falla se detecte
// unos segundos tarde, esta máquina vuelve al lobby en el mismo instante que las que sí mostraron
// el video.
export function VideoErrorRound({ round, onEnded, onFinished }: VideoErrorRoundProps) {
  const [exiting, setExiting] = useState(false)
  const { drawStartMs, videoDurationMs } = round

  // Depende solo de los dos números de la línea de tiempo, no de `round` entero: App actualiza
  // nextRoundStartIso a mitad de la ronda, y re-agendar acá podría volver a disparar onEnded (que
  // agenda el próximo sorteo) si ese momento ya pasó.
  useEffect(() => {
    const endedAt = drawStartMs + VIDEO_WHEEL_TRANSITION_DURATION_MS + videoDurationMs
    const holdEndAt = endedAt + RESULT_HOLD_MS
    const exitAt = holdEndAt + VIDEO_WHEEL_TRANSITION_DURATION_MS
    const finishedAt = exitAt + WINNER_PANEL_EXIT_DURATION_MS

    const at = (timestampMs: number, fn: () => void) => setTimeout(fn, Math.max(0, timestampMs - Date.now()))
    const timers = [
      at(endedAt, () => {
        commitPendingResult()
        onEnded()
      }),
      at(holdEndAt, () => useDrawCycleStore.getState().setActive(false)),
      at(exitAt, () => setExiting(true)),
      at(finishedAt, () => {
        useDrawCycleStore.getState().setLobbyInfoVisible(true)
        onFinished()
      }),
    ]
    return () => timers.forEach(clearTimeout)
  }, [drawStartMs, videoDurationMs, onEnded, onFinished])

  return <VideoErrorPanel nextRoundStartIso={round.nextRoundStartIso} exiting={exiting} />
}
