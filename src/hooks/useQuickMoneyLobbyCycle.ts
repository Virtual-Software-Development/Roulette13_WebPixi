import { useEffect } from 'react'
import { useLobbyModeStore } from '../store/useLobbyModeStore'
import { useQuickMoneyRoundStore } from '../store/useQuickMoneyRoundStore'
import { useQuickMoneyDrawsStore } from '../store/useQuickMoneyDrawsStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { parseApiDateTime } from '../utils/time'
import { preloadQuickMoneyVideo } from '../video/videoElements'
import {
  ESTIMATED_ROULETTE_DRAW_MS,
  QUICK_MONEY_DRAW_LEAD_MS,
  QUICK_MONEY_MIN_BLOCK_MS,
  QUICK_MONEY_PLACEHOLDER_VIDEO_URL,
  QUICK_MONEY_SPLIT_TRANSITION_MS,
  QUICK_MONEY_VIDEO_BUDGET_MS,
  ROULETTE_FOCUS_MS,
} from '../config/quickMoneyLobbyCycle'

const CHECK_INTERVAL_MS = 250
// El bloque termina cuando al round de Roulette le queda esto -- la transición de salida arranca
// acá, así a ROULETTE_FOCUS_MS la pantalla ya es 100% Roulette.
const BLOCK_EXIT_AT_MS = ROULETTE_FOCUS_MS + QUICK_MONEY_SPLIT_TRANSITION_MS
// Mínimo de bloque para entrar solo a mostrar el resultado (sin sorteo nuevo), ver más abajo.
const RESULT_ONLY_MIN_MS = 5_000

function randomDigits(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 10))
}

function preloadVideo() {
  preloadQuickMoneyVideo(QUICK_MONEY_PLACEHOLDER_VIDEO_URL).catch((err) =>
    console.error('No se pudo precargar el video de Quick Money', err),
  )
}

function toIso(ms: number): string {
  return new Date(ms).toISOString()
}

function currentRouletteDrawAtMs(): number {
  const nextDrawStartTime = useGameConfigStore.getState().nextDrawStartTime
  return nextDrawStartTime ? parseApiDateTime(nextDrawStartTime).getTime() : Date.now()
}

// Publica el sorteo pendiente en la tabla y deja el countdown apuntando al próximo bloque (estimado:
// próximo sorteo de Roulette + su video + el lead del countdown; se corrige al entrar ese bloque).
// También lo usa QuickMoneyVideoView al terminar su video.
export function publishPendingDraw(rouletteDrawAtMs: number = currentRouletteDrawAtMs()) {
  const { pendingDraw, setPendingDraw } = useLobbyModeStore.getState()
  if (!pendingDraw) return
  useQuickMoneyDrawsStore.getState().addDraw(pendingDraw)
  setPendingDraw(null)
  useQuickMoneyRoundStore.setState({
    nextDrawTime: toIso(rouletteDrawAtMs + ESTIMATED_ROULETTE_DRAW_MS + QUICK_MONEY_DRAW_LEAD_MS),
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
    // Precarga al abrir el lobby, así ni el primer sorteo de Quick Money espera la descarga.
    preloadVideo()

    // Un bloque por round: se identifica el round por su hora de sorteo (cambia recién cuando App
    // reagenda el siguiente, ver handleRoundEnded).
    let lastBlockRound: string | null = null

    const interval = setInterval(() => {
      const nextDrawStartTime = useGameConfigStore.getState().nextDrawStartTime
      if (!nextDrawStartTime) return
      const rouletteDrawAtMs = parseApiDateTime(nextDrawStartTime).getTime()
      const now = Date.now()
      const blockRemainingMs = rouletteDrawAtMs - now - BLOCK_EXIT_AT_MS

      const lobby = useLobbyModeStore.getState()
      const { active, lobbyInfoVisible } = useDrawCycleStore.getState()

      if (lobby.phase === 'roulette') {
        // Entra recién cuando terminó el sorteo de Roulette del todo (panel Winner incluido).
        if (!lobbyInfoVisible || active || lastBlockRound === nextDrawStartTime) return
        lastBlockRound = nextDrawStartTime
        if (blockRemainingMs < QUICK_MONEY_MIN_BLOCK_MS) {
          // No alcanza para un sorteo nuevo (típico al recargar la página en el tramo final del
          // bloque) -- en vez de caer a solo Roulette, entra directo al resultado con el último
          // sorteo de la tabla, sin generar uno nuevo. Con menos de RESULT_ONLY_MIN_MS no vale la
          // pena (entraría y saldría casi en la misma transición).
          if (blockRemainingMs < RESULT_ONLY_MIN_MS) return
          useQuickMoneyRoundStore.setState({
            nextDrawTime: toIso(rouletteDrawAtMs + ESTIMATED_ROULETTE_DRAW_MS + QUICK_MONEY_DRAW_LEAD_MS),
          })
          lobby.setPhase('quickMoneyResult')
          return
        }
        useQuickMoneyRoundStore.setState({ nextDrawTime: toIso(now + QUICK_MONEY_DRAW_LEAD_MS) })
        // Asegura que el video esté listo para cuando el countdown llegue a 0 (no-op si ya quedó
        // cargado desde el arranque o el round anterior).
        preloadVideo()
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
      if (lobby.pendingDraw || new Date(nextDrawTime).getTime() > now) return

      // Llegó la hora del sorteo de Quick Money: resultado mock, pendiente hasta que termine su video.
      lobby.setPendingDraw({
        gameNumber: drawNumber,
        drawnAt: toIso(now),
        pick3Result: randomDigits(3),
        pick4Result: randomDigits(4),
      })
      advanceRound()
      if (blockRemainingMs >= QUICK_MONEY_VIDEO_BUDGET_MS) {
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
