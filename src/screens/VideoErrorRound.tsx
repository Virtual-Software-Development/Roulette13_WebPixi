import { useEffect, useState } from 'react'
import { VideoErrorPanel } from './VideoErrorPanel'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { commitPendingResult } from '../store/commitPendingResult'
import { WINNER_PANEL_LEAD_SECONDS } from '../layout/layout.constants'
import { serverNow } from '../time/serverClock'
import {
  LOBBY_RETURN_OFFSET_MS,
  PLAY_START_OFFSET_MS,
  RESULT_HOLD_END_OFFSET_MS,
  VIDEO_WINDOW_END_OFFSET_MS,
  WINNER_EXIT_OFFSET_MS,
} from '../sync/lobbyTimeline'

export interface VideoErrorRoundInfo {
  // Hora programada del sorteo (/gameInfo nextDraw.startTime, en ms) -- ancla de toda la línea de
  // tiempo, igual para todas las máquinas.
  drawStartMs: number
  // Número ganador real de la ronda, o null si /drawResult no llegó a tiempo (el panel oculta la
  // sección RESULT). Se guarda acá y no se lee de pendingResult porque commitPendingResult lo
  // limpia al terminar el countdown, con el panel todavía en pantalla durante el hold.
  result: number | null
  // Instante (ms) en que el clip de las demás máquinas revela el número -- solo se conoce cuando el
  // video llegó a cargar y falló durante la reproducción (App.handlePlaybackFailed), porque el clip
  // es el mismo en todas. Sin él, el valor fijo de abajo.
  revealAtMs?: number
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
  const { drawStartMs } = round
  // Instante en que termina la ventana reservada del video (sync/lobbyTimeline.ts), la misma en todas
  // las máquinas sea cual sea su clip. Objetivo del countdown "CONTINUING IN" y de onEnded.
  const playStartAt = drawStartMs + PLAY_START_OFFSET_MS
  const endedAt = drawStartMs + VIDEO_WINDOW_END_OFFSET_MS
  // Instante en que el camino normal revela el resultado: RouletteVideoView muestra el panel Winner
  // cuando al video le quedan WINNER_PANEL_LEAD_SECONDS (onVideoNearEnd). Los videos no traen un
  // momento de revelación propio (ni el .webm ni /media-list ni el backend lo informan), así que es
  // el mismo valor configurado que usa el video real.
  const revealAt = round.revealAtMs ?? Math.max(playStartAt, endedAt - WINNER_PANEL_LEAD_SECONDS * 1000)

  // Depende solo de los números de la línea de tiempo, no de `round` entero: re-agendar acá podría
  // volver a disparar onEnded (que agenda el próximo sorteo) si ese momento ya pasó.
  useEffect(() => {
    const holdEndAt = drawStartMs + RESULT_HOLD_END_OFFSET_MS
    const exitAt = drawStartMs + WINNER_EXIT_OFFSET_MS
    const finishedAt = drawStartMs + LOBBY_RETURN_OFFSET_MS

    const at = (timestampMs: number, fn: () => void) => setTimeout(fn, Math.max(0, timestampMs - serverNow()))
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
  }, [drawStartMs, endedAt, onEnded, onFinished])

  return (
    <VideoErrorPanel
      result={round.result === null ? null : { game: 'roulette', number: round.result }}
      revealAtIso={new Date(revealAt).toISOString()}
      continueAtIso={new Date(endedAt).toISOString()}
      exiting={exiting}
    />
  )
}
