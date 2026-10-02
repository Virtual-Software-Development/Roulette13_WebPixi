import { useEffect } from 'react'
import { useLobbyModeStore } from '../store/useLobbyModeStore'
import { useQuickMoneyRoundStore } from '../store/useQuickMoneyRoundStore'
import { useQuickMoneyDrawsStore } from '../store/useQuickMoneyDrawsStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { parseApiDateTime } from '../utils/time'
import { prepareQuickMoneyDraw, takePreparedDraw } from '../video/quickMoneyTestVideo'
import {
  FALLBACK_ROULETTE_ROUND_MS,
  QUICK_MONEY_DRAW_AT_REMAINING_MS,
  QUICK_MONEY_DRAW_LEAD_MS,
  QUICK_MONEY_SPLIT_TRANSITION_MS,
  QUICK_MONEY_VIDEO_BUDGET_MS,
  QUICK_MONEY_VIDEO_REQUEST_LEAD_MS,
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

function randomDigits(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 10))
}

function toIso(ms: number): string {
  return new Date(ms).toISOString()
}

function currentRouletteDrawAtMs(): number {
  const nextDrawStartTime = useGameConfigStore.getState().nextDrawStartTime
  return nextDrawStartTime ? parseApiDateTime(nextDrawStartTime).getTime() : Date.now()
}

function roundIntervalMs(): number {
  return useGameConfigStore.getState().roundIntervalMs || FALLBACK_ROULETTE_ROUND_MS
}

// Hora del sorteo de Quick Money del round que termina con el sorteo de Roulette rouletteDrawAtMs.
function quickMoneyDrawAtMs(rouletteDrawAtMs: number): number {
  return rouletteDrawAtMs - QUICK_MONEY_DRAW_AT_REMAINING_MS
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
// Roulette. Un solo polling liviano leyendo los stores con getState() -- se monta en un componente
// que devuelve null (QuickMoneyLobbyCycle) para que los cambios de fase no re-rendericen App entero.
//
// quickMoneyVideo -> quickMoneyResult lo dispara QuickMoneyVideoView al terminar su video; este hook
// solo lo corta si el bloque se queda sin tiempo (red de seguridad, no debería pasar con el
// presupuesto de QUICK_MONEY_VIDEO_BUDGET_MS).
export function useQuickMoneyLobbyCycle() {
  useEffect(() => {
    // Un bloque por round: se identifica el round por su hora de sorteo (cambia recién cuando App
    // reagenda el siguiente, ver handleRoundEnded).
    let lastBlockRound: string | null = null

    const interval = setInterval(() => {
      const nextDrawStartTime = useGameConfigStore.getState().nextDrawStartTime
      if (!nextDrawStartTime) return
      const rouletteDrawAtMs = parseApiDateTime(nextDrawStartTime).getTime()
      const now = Date.now()
      const remainingMs = rouletteDrawAtMs - now
      const blockRemainingMs = remainingMs - BLOCK_EXIT_AT_MS
      const thisRoundDrawAtMs = quickMoneyDrawAtMs(rouletteDrawAtMs)

      // Pedido anticipado del video (números aleatorios del backend) para el próximo sorteo de Quick
      // Money que todavía no se jugó: el de este round, o si ya pasó, el del siguiente (estimado).
      // prepareQuickMoneyDraw es idempotente por sorteo.
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
          // El sorteo de este round ya pasó (típico al recargar la página a mitad del bloque) -- en
          // vez de caer a solo Roulette, entra directo al resultado con el último sorteo de la
          // tabla, sin generar uno nuevo. Con menos de RESULT_ONLY_MIN_MS no vale la pena (entraría
          // y saldría casi en la misma transición).
          if (blockRemainingMs < RESULT_ONLY_MIN_MS) return
          useQuickMoneyRoundStore.setState({ nextDrawTime: toIso(thisRoundDrawAtMs + roundIntervalMs()) })
          lobby.setPhase('quickMoneyResult')
          return
        }
        useQuickMoneyRoundStore.setState({ nextDrawTime: toIso(thisRoundDrawAtMs) })
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

      const { nextDrawTime, drawNumber, advanceRound } = useQuickMoneyRoundStore.getState()
      const drawAtMs = new Date(nextDrawTime).getTime()
      if (lobby.pendingDraw || drawAtMs > now) return

      // Llegó la hora del sorteo de Quick Money: los números que el backend generó junto con el video
      // (o locales si el backend no respondió), pendientes hasta que termine su video.
      const prepared = takePreparedDraw(drawAtMs)
      if (!prepared) console.warn('[quickMoneyLobbyCycle] sin números del backend para este sorteo -- se usan locales, sin video')
      lobby.setPendingDraw({
        gameNumber: drawNumber,
        drawnAt: toIso(now),
        pick3Result: prepared?.pick3 ?? randomDigits(3),
        pick4Result: prepared?.pick4 ?? randomDigits(4),
      })
      advanceRound()
      if (prepared?.videoUrl && blockRemainingMs >= QUICK_MONEY_VIDEO_BUDGET_MS) {
        lobby.setPendingVideoUrl(prepared.videoUrl)
        lobby.setPhase('quickMoneyVideo')
      } else {
        if (prepared && !prepared.videoUrl) console.warn('[quickMoneyLobbyCycle] el video no llegó a tiempo -- resultado sin video')
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
