import { useEffect, useState } from 'react'
import { VideoErrorPanel } from './VideoErrorPanel'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { commitPendingResult } from '../store/commitPendingResult'
import {
  RESULT_HOLD_MS,
  VIDEO_WHEEL_TRANSITION_DURATION_MS,
  WINNER_PANEL_EXIT_DURATION_MS,
  WINNER_PANEL_LEAD_SECONDS,
} from '../layout/layout.constants'

export interface VideoErrorRoundInfo {
  // Hora programada del sorteo (/gameInfo nextDraw.startTime, en ms) -- ancla de toda la línea de
  // tiempo, igual para todas las máquinas.
  drawStartMs: number
  // Duración del video que se iba a mostrar (ver video/videoDuration.ts).
  videoDurationMs: number
  // Número ganador real de la ronda, o null si /drawResult no llegó a tiempo (el panel oculta la
  // sección RESULT). Se guarda acá y no se lee de pendingResult porque commitPendingResult lo
  // limpia al terminar el countdown, con el panel todavía en pantalla durante el hold.
  result: number | null
}

interface VideoErrorRoundProps {
  round: VideoErrorRoundInfo
  // Mismo contrato que RouletteVideoView: onEnded en el instante en que el video habría terminado
  // (App agenda ahí el próximo sorteo), onFinished cuando el panel ya salió y el lobby volvió.
  onEnded: () => void
  onFinished: () => void
}

// Reemplaza a RouletteVideoView cuando el video del sorteo no cargó (ver App.tsx). Muestra
// VideoErrorPanel (RESULT IN hasta el instante en que el video habría revelado el resultado, y
// CONTINUING IN hasta el instante en que habría terminado) y repite, con timers, la MISMA secuencia que el camino normal -- subida del video,
// reproducción, hold sobre el resultado, bajada y salida del panel Winner -- pero contada desde la
// hora programada del sorteo y no desde que el panel apareció: así, aunque la falla se detecte
// unos segundos tarde, esta máquina vuelve al lobby en el mismo instante que las que sí mostraron
// el video.
export function VideoErrorRound({ round, onEnded, onFinished }: VideoErrorRoundProps) {
  const [exiting, setExiting] = useState(false)
  const { drawStartMs, videoDurationMs } = round
  // Instante en que el video habría terminado: subida del video + su duración, contado desde la
  // hora programada del sorteo. Objetivo del countdown "CONTINUING IN" y de onEnded.
  const playStartAt = drawStartMs + VIDEO_WHEEL_TRANSITION_DURATION_MS
  const endedAt = playStartAt + videoDurationMs
  // Instante en que el camino normal revela el resultado: RouletteVideoView muestra el panel Winner
  // cuando al video le quedan WINNER_PANEL_LEAD_SECONDS (onVideoNearEnd). Los videos no traen un
  // momento de revelación propio (ni el .webm ni /media-list ni el backend lo informan), así que es
  // el mismo valor configurado que usa el video real.
  const revealAt = Math.max(playStartAt, endedAt - WINNER_PANEL_LEAD_SECONDS * 1000)

  // Depende solo de los números de la línea de tiempo, no de `round` entero: re-agendar acá podría
  // volver a disparar onEnded (que agenda el próximo sorteo) si ese momento ya pasó.
  useEffect(() => {
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
  }, [endedAt, onEnded, onFinished])

  return (
    <VideoErrorPanel
      result={round.result === null ? null : { game: 'roulette', number: round.result }}
      revealAtIso={new Date(revealAt).toISOString()}
      continueAtIso={new Date(endedAt).toISOString()}
      exiting={exiting}
    />
  )
}
