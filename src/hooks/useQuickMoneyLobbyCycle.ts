import { useEffect } from 'react'
import { useLobbyModeStore } from '../store/useLobbyModeStore'
import { nextDrawNumber, useQuickMoneyRoundStore } from '../store/useQuickMoneyRoundStore'
import { useQuickMoneyDrawsStore } from '../store/useQuickMoneyDrawsStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { serverNow } from '../time/serverClock'
import { QUICK_MONEY_RESULT_OFFSET_MS, quickMoneyBlockEnterMs, quickMoneyBlockExitMs } from '../sync/lobbyTimeline'
import { startQuickMoneyScheduleSync, useQuickMoneyScheduleStore } from '../sync/quickMoneySchedule'
import { prepareQuickMoneyDraw, takePreparedDraw } from '../video/quickMoneyDrawVideo'
import { fetchQuickMoneyLobbyDraw } from '../api/quickMoneyLobbyDraw'
import { QUICK_MONEY_NUMBERS_WAIT_MS, QUICK_MONEY_VIDEO_BUDGET_MS, QUICK_MONEY_VIDEO_REQUEST_LEAD_MS } from '../config/quickMoneyLobbyCycle'

const CHECK_INTERVAL_MS = 250
// Mínimo de bloque para entrar solo a mostrar el resultado (sin sorteo nuevo), ver más abajo.
const RESULT_ONLY_MIN_MS = 5_000

// Sorteo cuya fase de video arrancó sin sus números (llegaban tarde): se siguen esperando y, si
// llegan, el panel de video no disponible los revela a la misma hora que el video en las demás.
let lateDrawAtMs: number | null = null

function toIso(ms: number): string {
  return new Date(ms).toISOString()
}

// Fuera del bloque, el countdown "Next Draw" y el número de Quick Money muestran el próximo sorteo
// real del backend (sync/quickMoneySchedule.ts).
function showNextRealDraw() {
  const { nextDrawAtMs, nextDrawNumber: number } = useQuickMoneyScheduleStore.getState()
  if (nextDrawAtMs === null) return
  const round = useQuickMoneyRoundStore.getState()
  const nextDrawTime = toIso(nextDrawAtMs)
  if (round.nextDrawTime !== nextDrawTime || (number && round.drawNumber !== number)) {
    useQuickMoneyRoundStore.setState({ nextDrawTime, ...(number ? { drawNumber: number } : {}) })
  }
}

// Publica el sorteo pendiente en la tabla. También lo usa QuickMoneyPiecesView al terminar su video.
export function publishPendingDraw() {
  const { pendingDraw, setPendingDraw } = useLobbyModeStore.getState()
  if (!pendingDraw) return
  useQuickMoneyDrawsStore.getState().addDraw(pendingDraw)
  setPendingDraw(null)
}

// Máquina de fases del lobby compartido (ver config/quickMoneyLobbyCycle.ts), anclada a los sorteos
// REALES de Quick Money (sync/quickMoneySchedule.ts: sus horas salen del backend, que nunca los
// superpone con la ruleta) y al reloj del servidor (time/serverClock.ts), así todas las máquinas
// cambian de fase a la vez. Un solo polling liviano leyendo los stores con getState() -- se monta en
// un componente que devuelve null (QuickMoneyLobbyCycle) para que los cambios de fase no
// re-rendericen App entero.
//
// Cada bloque es el de un round REAL de Quick Money: su número y sus números salen del backend
// (video/quickMoneyDrawVideo.ts), así que es el mismo sorteo en todas las máquinas, incluso si un admin
// cambió el resultado; el video lo arma cada máquina con las piezas de local-media
// (QuickMoneyPiecesView). Nunca se inventan números locales: sin sorteo real, no se muestra sorteo.
// quickMoneyVideo -> quickMoneyResult lo dispara QuickMoneyPiecesView a una hora absoluta; este hook
// solo lo corta si el bloque se queda sin tiempo. Una máquina que llega tarde al video (arrancó a
// mitad de él) no entra a mitad: muestra el panel de video no disponible con los mismos números, que
// revela y sale cuando el video termina en las demás (pedido explícito, ver
// QUICK_MONEY_VIDEO_LATE_JOIN_MS).
export function useQuickMoneyLobbyCycle() {
  useEffect(() => {
    startQuickMoneyScheduleSync(serverNow)
    // El sorteo del bloque en curso (o del último que entró): un bloque por sorteo.
    let blockDrawAtMs: number | null = null

    const interval = setInterval(() => {
      const now = serverNow()
      const schedule = useQuickMoneyScheduleStore.getState()
      const lobby = useLobbyModeStore.getState()
      const { active, lobbyInfoVisible } = useDrawCycleStore.getState()

      // Preparación del próximo sorteo (idempotente por sorteo).
      if (schedule.nextDrawAtMs !== null && schedule.nextDrawAtMs - now <= QUICK_MONEY_VIDEO_REQUEST_LEAD_MS) {
        prepareQuickMoneyDraw(schedule.nextDrawAtMs)
      }

      if (lobby.phase === 'roulette') {
        // Fuera del bloque: el countdown apunta al próximo sorteo real.
        showNextRealDraw()
        // Nunca durante un sorteo de Roulette (el backend ya los separa; esto cubre una máquina
        // atrasada).
        if (!lobbyInfoVisible || active) return
        // El bloque del próximo sorteo, o el del último si la máquina llegó a mitad de él.
        const candidates = [schedule.nextDrawAtMs, schedule.lastDrawAtMs].filter((ms): ms is number => ms !== null)
        const drawAtMs = candidates.find((ms) => ms !== blockDrawAtMs && now >= quickMoneyBlockEnterMs(ms) && now < quickMoneyBlockExitMs(ms))
        if (drawAtMs === undefined) return
        const blockRemainingMs = quickMoneyBlockExitMs(drawAtMs) - now
        blockDrawAtMs = drawAtMs
        if (drawAtMs <= now) {
          // El sorteo ya pasó (la máquina arrancó a mitad del bloque).
          const publishAt = drawAtMs + QUICK_MONEY_RESULT_OFFSET_MS
          if (now < publishAt) {
            // Las demás están mostrando su video: no se salta al medio, se muestra el panel de video
            // no disponible (QuickMoneyPiecesView, ver QUICK_MONEY_VIDEO_LATE_JOIN_MS) con los números
            // del sorteo real, anclado a la misma hora del sorteo.
            void fetchQuickMoneyLobbyDraw(drawAtMs)
              .catch(() => null)
              .then((draw) => {
                const current = useLobbyModeStore.getState()
                if (current.phase !== 'roulette' || current.pendingDraw) return
                if (draw?.estado !== 'drawn' || !draw.pick3 || !draw.pick4) return
                current.setPendingDraw({
                  gameNumber: draw.numeroEvento,
                  drawnAt: toIso(drawAtMs),
                  pick3Result: Array.from(draw.pick3, Number),
                  pick4Result: Array.from(draw.pick4, Number),
                })
                current.setPhase('quickMoneyVideo')
              })
            return
          }
          // Ya publicado (la tabla lo trae desde el arranque, ver seedQuickMoneyDraws): directo al
          // resultado. Con menos de RESULT_ONLY_MIN_MS no vale la pena (entraría y saldría casi en la
          // misma transición).
          if (blockRemainingMs < RESULT_ONLY_MIN_MS) return
          lobby.setPhase('quickMoneyResult')
          return
        }
        useQuickMoneyRoundStore.setState({
          nextDrawTime: toIso(drawAtMs),
          ...(schedule.nextDrawAtMs === drawAtMs && schedule.nextDrawNumber ? { drawNumber: schedule.nextDrawNumber } : {}),
        })
        lobby.setPhase('quickMoneySplit')
        return
      }

      if (blockDrawAtMs === null) {
        // Un bloque sin sorteo conocido (no debería pasar): vuelve a Roulette.
        lobby.setPhase('roulette')
        return
      }
      const blockRemainingMs = quickMoneyBlockExitMs(blockDrawAtMs) - now

      // Fin del bloque: vuelve a Roulette pase lo que pase (si el video siguiera, se corta y el
      // resultado se publica igual).
      if (blockRemainingMs <= 0) {
        lateDrawAtMs = null
        publishPendingDraw()
        lobby.setPhase('roulette')
        return
      }

      // Panel de video no disponible sin números: llegan tarde (el backend ejecutó tarde el sorteo).
      if (lobby.phase === 'quickMoneyVideo' && !lobby.pendingDraw && lateDrawAtMs !== null) {
        const late = takePreparedDraw(lateDrawAtMs)
        if (late.status === 'ready') {
          lobby.setPendingDraw({
            gameNumber: late.draw.drawNumber,
            drawnAt: toIso(lateDrawAtMs),
            pick3Result: late.draw.pick3,
            pick4Result: late.draw.pick4,
          })
          lateDrawAtMs = null
        } else if (late.status === 'unavailable') {
          lateDrawAtMs = null
        }
        return
      }

      if (lobby.phase !== 'quickMoneySplit') return

      const drawAtMs = blockDrawAtMs
      if (lobby.pendingDraw || drawAtMs > now) return

      // Llegó la hora del sorteo de Quick Money: el resultado del sorteo real del backend, pendiente
      // hasta que termine su video. Hasta que llegan sus números el split queda con el countdown en
      // 0, como mucho QUICK_MONEY_NUMBERS_WAIT_MS (normalmente ya llegaron ~2s antes).
      const mayWait = now < drawAtMs + QUICK_MONEY_NUMBERS_WAIT_MS
      const taken = takePreparedDraw(drawAtMs)
      if (taken.status === 'waiting' && mayWait) return
      if (taken.status !== 'ready') {
        // Sin números todavía (o sin sorteo real): igual que Roulette, el panel de video no disponible
        // con su countdown, a la misma hora que el video en las demás máquinas. Si los números llegan
        // antes de que el video los hubiera revelado, el panel los revela (ver lateDrawAtMs); si no,
        // solo cuenta CONTINUING IN.
        console.warn('[quickMoneyLobbyCycle] sin el resultado del backend a la hora del sorteo -- panel de video no disponible')
        lateDrawAtMs = taken.status === 'waiting' ? drawAtMs : null
        if (blockRemainingMs >= QUICK_MONEY_VIDEO_BUDGET_MS) {
          lobby.setPendingDrawAtMs(drawAtMs)
          lobby.setPhase('quickMoneyVideo')
        } else {
          lateDrawAtMs = null
          lobby.setPhase('quickMoneyResult')
        }
        return
      }
      const { draw } = taken
      lobby.setPendingDraw({
        gameNumber: draw.drawNumber,
        // La hora programada, no `now`: es el ancla del video (QuickMoneyPiecesView) y la hora que
        // muestra la tabla, igual en todas las máquinas.
        drawnAt: toIso(drawAtMs),
        pick3Result: draw.pick3,
        pick4Result: draw.pick4,
      })
      // El número que sigue mientras dura el bloque; al volver a Roulette se reemplaza por el del
      // próximo sorteo real (showNextRealDraw).
      useQuickMoneyRoundStore.setState({ drawNumber: nextDrawNumber(draw.drawNumber) })

      // Fase de video: QuickMoneyPiecesView lo arma con las piezas de local-media (si faltan, muestra
      // VideoErrorPanel con el resultado durante lo que habría durado el video). Sin tiempo en el
      // bloque, resultado directo.
      if (blockRemainingMs >= QUICK_MONEY_VIDEO_BUDGET_MS) {
        lobby.setPendingDrawAtMs(drawAtMs)
        lobby.setPhase('quickMoneyVideo')
      } else {
        publishPendingDraw()
        lobby.setPhase('quickMoneyResult')
      }
    }, CHECK_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [])
}

export function QuickMoneyLobbyCycle() {
  useQuickMoneyLobbyCycle()
  return null
}
