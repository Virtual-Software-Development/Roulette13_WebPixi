import { useEffect, useRef, useState } from 'react'
import { useLobbyModeStore } from '../store/useLobbyModeStore'
import { publishPendingDraw } from '../hooks/useQuickMoneyLobbyCycle'
import { QUICK_MONEY_VIDEO_FADE_MS, QUICK_MONEY_VIDEO_LATE_JOIN_MS } from '../config/quickMoneyLobbyCycle'
import { QUICK_MONEY_VIDEO_END_OFFSET_MS } from '../sync/lobbyTimeline'
import { serverNow } from '../time/serverClock'
import { buildPiecesPlan, loadPiecesManifest } from '../video/quickMoneyPieces/plan'
import { PiecesPlayer } from '../video/quickMoneyPieces/PiecesPlayer'
import { VideoErrorPanel, type VideoErrorResult } from './VideoErrorPanel'
import type { QuickMoneyLobbyDraw } from '../data/quickMoneyLobbyMockData'
import '../video/quickMoneyPieces/quickMoneyPieces.css'

// Video del sorteo de Quick Money, armado por piezas en el navegador: se tocan en orden los videos
// ya cortados de local-media/QuickMoney/ con los recortes de los dígitos que salieron encima
// (video/quickMoneyPieces/). No hay video por sorteo que renderizar ni descargar: del backend solo
// salen los números (video/quickMoneyDrawVideo.ts). Las piezas las genera QuickMoney_Video_Generator
// y se copian con `npm run quick-money-pieces`.
//
// Montado solo en la fase 'quickMoneyVideo' (ver useQuickMoneyLobbyCycle). Arranca a la hora del
// sorteo (adelantado los ms que se haya montado tarde), fade in, y a
// drawAt + QUICK_MONEY_VIDEO_END_OFFSET_MS fade out, publica el resultado y pasa a
// 'quickMoneyResult' -- a la misma hora en todas las máquinas (sync/lobbyTimeline.ts). Sin números,
// sin piezas, o si la fase empezó más de QUICK_MONEY_VIDEO_LATE_JOIN_MS tarde (no se entra a mitad
// del video), VideoErrorPanel durante lo que habría durado el video.

interface VideoFallback {
  result: VideoErrorResult | null
  endedAtIso: string
}

function toFallbackResult(pendingDraw: QuickMoneyLobbyDraw | null): VideoErrorResult | null {
  return pendingDraw ? { game: 'quickMoney', pick3: pendingDraw.pick3Result, pick4: pendingDraw.pick4Result } : null
}

export function QuickMoneyPiecesView() {
  const stageRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [fallback, setFallback] = useState<VideoFallback | null>(null)
  const [exiting, setExiting] = useState(false)
  const lateResult = toFallbackResult(useLobbyModeStore((state) => state.pendingDraw))

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const { pendingDraw, pendingDrawAtMs } = useLobbyModeStore.getState()
    const drawAtMs = pendingDraw ? new Date(pendingDraw.drawnAt).getTime() : (pendingDrawAtMs ?? serverNow())
    const endedAt = drawAtMs + QUICK_MONEY_VIDEO_END_OFFSET_MS
    let cancelled = false
    let finished = false
    let player: PiecesPlayer | null = null
    const timers: ReturnType<typeof setTimeout>[] = []
    const at = (timestampMs: number, fn: () => void) => timers.push(setTimeout(fn, Math.max(0, timestampMs - serverNow())))

    function complete() {
      if (finished || cancelled) return
      finished = true
      setVisible(false)
      setExiting(true)
      timers.push(
        setTimeout(() => {
          publishPendingDraw()
          useLobbyModeStore.getState().setPhase('quickMoneyResult')
        }, QUICK_MONEY_VIDEO_FADE_MS)
      )
    }

    function showFallback(reason: unknown, expected = false) {
      if (cancelled) return
      if (expected) console.info('[QuickMoneyPiecesView]', reason, '-- se muestra el panel de video no disponible')
      else console.error('No se pudo armar el video de Quick Money por piezas -- se muestra el panel de video no disponible', reason)
      player?.destroy()
      player = null
      setVisible(false)
      setFallback({
        result: toFallbackResult(useLobbyModeStore.getState().pendingDraw),
        endedAtIso: new Date(endedAt).toISOString(),
      })
    }

    // Salida a la hora en que termina en todas las máquinas, haya video o panel.
    at(endedAt, complete)

    const lateMs = serverNow() - drawAtMs
    if (!pendingDraw) {
      // Fase de video sin números (llegaron tarde, ver useQuickMoneyLobbyCycle): panel.
      showFallback('el sorteo todavía no tiene números', true)
    } else if (lateMs > QUICK_MONEY_VIDEO_LATE_JOIN_MS) {
      // Esta máquina llegó con el video ya empezado en las demás: panel, no se entra a mitad.
      showFallback(`la fase de video empezó ${(lateMs / 1000).toFixed(1)}s después del sorteo`, true)
    } else {
      loadPiecesManifest()
        .then((manifest) => {
          if (cancelled) return
          const plan = buildPiecesPlan(manifest, pendingDraw.pick3Result, pendingDraw.pick4Result)
          // Al terminar, se sale recién a la hora común (at(endedAt) de arriba): si se salteó la
          // transición (faltaba su pieza) el video termina ~1.2s antes, y mientras queda quieto en
          // la pantalla de resultado, que ya muestra los números. Así todas las máquinas pasan al
          // resultado a la vez.
          const onEnded = () => {
            if (serverNow() >= endedAt - 250) complete()
          }
          player = new PiecesPlayer({ container: stage, plan, onEnded, onError: showFallback })
          return player.start(() => serverNow() - drawAtMs).then(() => {
            if (!cancelled && !finished && player) setVisible(true)
          })
        })
        .catch(showFallback)
    }

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      player?.destroy()
    }
  }, [])

  return (
    <>
      <div className={`qm-pieces${visible ? ' qm-pieces--visible' : ''}`}>
        <div className="qm-pieces-stage" ref={stageRef} />
      </div>
      {fallback && (
        <VideoErrorPanel
          result={fallback.result ?? lateResult}
          revealAtIso={fallback.endedAtIso}
          continueAtIso={fallback.endedAtIso}
          exiting={exiting}
          backdrop="plain"
        />
      )}
    </>
  )
}
