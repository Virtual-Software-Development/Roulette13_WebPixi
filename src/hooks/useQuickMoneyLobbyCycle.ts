import { useEffect } from 'react'
import { useLobbyModeStore } from '../store/useLobbyModeStore'
import { nextDrawNumber, useQuickMoneyRoundStore } from '../store/useQuickMoneyRoundStore'
import { useQuickMoneyDrawsStore } from '../store/useQuickMoneyDrawsStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { parseApiDateTime } from '../utils/time'
import { serverNow } from '../time/serverClock'
import { QUICK_MONEY_RESULT_OFFSET_MS, quickMoneyDrawAtMs } from '../sync/lobbyTimeline'
import { prepareQuickMoneyDraw, takePreparedDraw } from '../video/quickMoneyDrawVideo'
import { fetchQuickMoneyLobbyDraw } from '../api/quickMoneyLobbyDraw'
import { fetchCurrentEvent } from '../api/terminalTicket'
import {
  FALLBACK_ROULETTE_ROUND_MS,
  QUICK_MONEY_DRAW_AT_REMAINING_MS,
  QUICK_MONEY_DRAW_LEAD_MS,
  QUICK_MONEY_SPLIT_TRANSITION_MS,
  QUICK_MONEY_VIDEO_BUDGET_MS,
  QUICK_MONEY_VIDEO_REQUEST_LEAD_MS,
  QUICK_MONEY_VIDEO_WAIT_MS,
  ROULETTE_FOCUS_MS,
} from '../config/quickMoneyLobbyCycle'

const CHECK_INTERVAL_MS = 250
// El bloque termina cuando al round de Roulette le queda esto -- la transición de salida arranca
// acá, así a ROULETTE_FOCUS_MS la pantalla ya es 100% Roulette.
const BLOCK_EXIT_AT_MS = ROULETTE_FOCUS_MS + QUICK_MONEY_SPLIT_TRANSITION_MS
// El split entra cuando al round de Roulette le queda esto (countdown de QUICK_MONEY_DRAW_LEAD_MS).
const BLOCK_ENTER_AT_MS = QUICK_MONEY_DRAW_AT_REMAINING_MS + QUICK_MONEY_DRAW_LEAD_MS
// Mínimo de bloque para entrar solo a mostrar el resultado (sin sorteo nuevo), ver más abajo.
const RESULT_ONLY_MIN_MS = 5_000

function toIso(ms: number): string {
  return new Date(ms).toISOString()
}

function currentRouletteDrawAtMs(): number {
  const nextDrawStartTime = useGameConfigStore.getState().nextDrawStartTime
  return nextDrawStartTime ? parseApiDateTime(nextDrawStartTime).getTime() : serverNow()
}

function roundIntervalMs(): number {
  return useGameConfigStore.getState().roundIntervalMs || FALLBACK_ROULETTE_ROUND_MS
}

// Número del sorteo real de Quick Money que se juega a drawAtMs (el round abierto del backend), para
// el countdown del split.
async function syncDrawNumber(drawAtMs: number) {
  const event = await fetchCurrentEvent('lottery').catch(() => null)
  if (!event || Math.abs(new Date(event.horaProgramada).getTime() - drawAtMs) >= 60_000) return
  const { nextDrawTime } = useQuickMoneyRoundStore.getState()
  if (new Date(nextDrawTime).getTime() === drawAtMs) useQuickMoneyRoundStore.setState({ drawNumber: event.numeroEvento })
}

// Publica el sorteo pendiente en la tabla y deja el countdown apuntando al sorteo de Quick Money del
// round siguiente (estimado con roundInterval; se corrige al entrar ese bloque). También lo usa
// QuickMoneyVideoView al terminar su video.
export function publishPendingDraw(rouletteDrawAtMs: number = currentRouletteDrawAtMs()) {
  const { pendingDraw, setPendingDraw, setPendingVideoUrl } = useLobbyModeStore.getState()
  if (!pendingDraw) return
  useQuickMoneyDrawsStore.getState().addDraw(pendingDraw)
  setPendingDraw(null)
  setPendingVideoUrl(null)
  useQuickMoneyRoundStore.setState({
    nextDrawTime: toIso(quickMoneyDrawAtMs(rouletteDrawAtMs) + roundIntervalMs()),
  })
}

// Máquina de fases del lobby compartido (ver config/quickMoneyLobbyCycle.ts), anclada al reloj de
// Roulette y al reloj del servidor (time/serverClock.ts), así todas las máquinas cambian de fase a la
// vez. Un solo polling liviano leyendo los stores con getState() -- se monta en un componente que
// devuelve null (QuickMoneyLobbyCycle) para que los cambios de fase no re-rendericen App entero.
//
// Cada sorteo de Quick Money del lobby es el round REAL de Quick Money que el backend agenda en ese
// slot (events.LobbyQuickMoneyLead): su número, sus números y su video salen del backend
// (video/quickMoneyDrawVideo.ts), así que es el mismo sorteo en todas las máquinas, incluso si un admin
// cambió el resultado. Nunca se inventan números locales: sin sorteo real, no se muestra sorteo. quickMoneyVideo -> quickMoneyResult lo dispara
// QuickMoneyVideoView a una hora absoluta; este hook solo lo corta si el bloque se queda sin tiempo.
// Una máquina que llega tarde al video (arrancó a mitad de él, o no alcanzó a descargarlo) muestra el
// panel de video no disponible con los mismos números, que revela y sale cuando el video termina en
// las demás (pedido explícito, en vez de esperar con "Sincronizando…").
export function useQuickMoneyLobbyCycle() {
  useEffect(() => {
    // Un bloque por round: se identifica el round por su hora de sorteo (cambia recién cuando App
    // reagenda el siguiente, ver handleRoundEnded).
    let lastBlockRound: string | null = null

    const interval = setInterval(() => {
      const nextDrawStartTime = useGameConfigStore.getState().nextDrawStartTime
      if (!nextDrawStartTime) return
      const rouletteDrawAtMs = parseApiDateTime(nextDrawStartTime).getTime()
      const now = serverNow()
      const remainingMs = rouletteDrawAtMs - now
      const blockRemainingMs = remainingMs - BLOCK_EXIT_AT_MS
      const thisRoundDrawAtMs = quickMoneyDrawAtMs(rouletteDrawAtMs)

      // Preparación del próximo sorteo de Quick Money que todavía no se jugó: el de este round, o si ya
      // pasó, el del siguiente (estimado). prepareQuickMoneyDraw es idempotente por sorteo.
      const upcomingDrawAtMs =
        lastBlockRound !== nextDrawStartTime && thisRoundDrawAtMs > now ? thisRoundDrawAtMs : thisRoundDrawAtMs + roundIntervalMs()
      if (upcomingDrawAtMs - now <= QUICK_MONEY_VIDEO_REQUEST_LEAD_MS) {
        prepareQuickMoneyDraw(upcomingDrawAtMs)
      }

      const lobby = useLobbyModeStore.getState()
      const { active, lobbyInfoVisible } = useDrawCycleStore.getState()

      if (lobby.phase === 'roulette') {
        // Entra a mitad del round (BLOCK_ENTER_AT_MS), nunca durante un sorteo de Roulette.
        if (!lobbyInfoVisible || active || lastBlockRound === nextDrawStartTime) return
        if (remainingMs > BLOCK_ENTER_AT_MS || blockRemainingMs <= 0) return
        lastBlockRound = nextDrawStartTime
        if (thisRoundDrawAtMs <= now) {
          // El sorteo de este round ya pasó (la máquina arrancó a mitad del bloque).
          const publishAt = thisRoundDrawAtMs + QUICK_MONEY_RESULT_OFFSET_MS
          useQuickMoneyRoundStore.setState({ nextDrawTime: toIso(thisRoundDrawAtMs + roundIntervalMs()) })
          if (now < publishAt) {
            // Las demás están mostrando su video: no se salta al medio, se muestra el panel de video
            // no disponible (QuickMoneyVideoView sin video) con los números del sorteo real, anclado a
            // la misma hora del sorteo.
            void fetchQuickMoneyLobbyDraw(thisRoundDrawAtMs)
              .catch(() => null)
              .then((draw) => {
              const current = useLobbyModeStore.getState()
              if (current.phase !== 'roulette' || current.pendingDraw) return
              if (draw?.estado !== 'drawn' || !draw.pick3 || !draw.pick4) return
              useQuickMoneyRoundStore.setState({ drawNumber: nextDrawNumber(draw.numeroEvento) })
              current.setPendingDraw({
                gameNumber: draw.numeroEvento,
                drawnAt: toIso(thisRoundDrawAtMs),
                pick3Result: Array.from(draw.pick3, Number),
                pick4Result: Array.from(draw.pick4, Number),
              })
              current.setPendingVideoUrl(null)
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
        useQuickMoneyRoundStore.setState({ nextDrawTime: toIso(thisRoundDrawAtMs) })
        void syncDrawNumber(thisRoundDrawAtMs)
        lobby.setPhase('quickMoneySplit')
        return
      }

      // Fin del bloque: vuelve a Roulette pase lo que pase (si el video siguiera, se corta y el
      // resultado se publica igual).
      if (blockRemainingMs <= 0) {
        publishPendingDraw(rouletteDrawAtMs)
        lobby.setPhase('roulette')
        return
      }

      if (lobby.phase !== 'quickMoneySplit') return

      const { nextDrawTime, drawNumber } = useQuickMoneyRoundStore.getState()
      const drawAtMs = new Date(nextDrawTime).getTime()
      if (lobby.pendingDraw || drawAtMs > now) return

      // Llegó la hora del sorteo de Quick Money: el resultado del sorteo real del backend, pendiente
      // hasta que termine su video. Hasta que llegan sus números (y, unos segundos, su video) el split
      // queda con el countdown en 0.
      const taken = takePreparedDraw(drawAtMs, now < drawAtMs + QUICK_MONEY_VIDEO_WAIT_MS)
      if (taken.status === 'waiting') return
      if (taken.status === 'unavailable') {
        // Sin sorteo real no hay resultado que mostrar: se sigue al próximo, con el último resultado.
        console.warn('[quickMoneyLobbyCycle] el backend no tiene un sorteo de Quick Money a esta hora')
        useQuickMoneyRoundStore.setState({ nextDrawTime: toIso(drawAtMs + roundIntervalMs()), drawNumber: nextDrawNumber(drawNumber) })
        lobby.setPhase('quickMoneyResult')
        return
      }
      const { draw } = taken
      lobby.setPendingDraw({
        gameNumber: draw.drawNumber,
        // La hora programada, no `now`: es el ancla del video (QuickMoneyVideoView) y la hora que
        // muestra la tabla, igual en todas las máquinas.
        drawnAt: toIso(drawAtMs),
        pick3Result: draw.pick3,
        pick4Result: draw.pick4,
      })
      useQuickMoneyRoundStore.setState({ nextDrawTime: toIso(drawAtMs + roundIntervalMs()), drawNumber: nextDrawNumber(draw.drawNumber) })

      // Entra a la fase de video aunque el video no haya llegado a tiempo: QuickMoneyVideoView muestra
      // entonces VideoErrorPanel con el resultado durante lo que habría durado el video. Sin tiempo en
      // el bloque, resultado directo.
      if (blockRemainingMs >= QUICK_MONEY_VIDEO_BUDGET_MS) {
        if (!draw.videoUrl) console.warn('[quickMoneyLobbyCycle] el video no llegó a tiempo -- se muestra el panel de video no disponible')
        lobby.setPendingVideoUrl(draw.videoUrl)
        lobby.setPhase('quickMoneyVideo')
      } else {
        publishPendingDraw(rouletteDrawAtMs)
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
