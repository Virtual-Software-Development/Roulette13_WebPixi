import {
  QUICK_MONEY_ANTEROOM_MS,
  QUICK_MONEY_RESULT_HOLD_MS,
  ROTATION_JACKPOT_VIEW_MS,
  ROTATION_QUICK_MONEY_VIEW_MS,
  ROTATION_ROULETTE_VIEW_MS,
  ROULETTE_ANTEROOM_MS,
  ROULETTE_SUMMARY_MS,
} from '../config/lobbyMode'
import {
  DRAW_SUMMARY_EXIT_MARGIN_MS,
  QUICK_MONEY_RESULT_OFFSET_MS,
  QUICK_MONEY_VIDEO_END_OFFSET_MS,
  RESULT_HOLD_END_OFFSET_MS,
  type DrawSummaryWindow,
} from './lobbyTimeline'

// Lobby en modo 'rotation' (config/lobbyMode.ts): qué vista toca en cada instante, con la hora del
// servidor, igual en todas las máquinas. Funciones puras -- las usa useLobbyRotationCycle.

export type LobbyView = 'roulette' | 'quickMoney' | 'jackpot'

const ROTATION_CYCLE_MS = ROTATION_ROULETTE_VIEW_MS + ROTATION_QUICK_MONEY_VIEW_MS + ROTATION_JACKPOT_VIEW_MS

// Hasta cuándo, contado desde su sorteo, cada juego mantiene fija su vista.
export const ROULETTE_FORCED_TAIL_MS = RESULT_HOLD_END_OFFSET_MS + ROULETTE_SUMMARY_MS
export const QUICK_MONEY_FORCED_TAIL_MS = QUICK_MONEY_RESULT_OFFSET_MS + QUICK_MONEY_RESULT_HOLD_MS

// Rotación sin sorteos cerca: Roulette 2:00 -> Quick Money 7:00 -> Jackpot 1:00, en ciclos de 10:00
// que arrancan a hora fija (:00, :10...). Al salir de una vista fija se vuelve a lo que indica el
// reloj, no al principio del ciclo.
export function rotationViewAt(nowMs: number): LobbyView {
  const offset = ((nowMs % ROTATION_CYCLE_MS) + ROTATION_CYCLE_MS) % ROTATION_CYCLE_MS
  if (offset < ROTATION_ROULETTE_VIEW_MS) return 'roulette'
  if (offset < ROTATION_ROULETTE_VIEW_MS + ROTATION_QUICK_MONEY_VIEW_MS) return 'quickMoney'
  return 'jackpot'
}

// Horas (ms) de los sorteos que importan ahora: next = el próximo que todavía no se jugó (del
// backend); last = el último que se jugó, mientras su secuencia puede seguir en pantalla.
export interface LobbyDrawTimes {
  nextRouletteDrawMs: number | null
  lastRouletteDrawMs: number | null
  nextQuickMoneyDrawMs: number | null
  lastQuickMoneyDrawMs: number | null
}

export interface LobbyViewState {
  view: LobbyView
  // Juego que fijó la vista (su antesala o lo que sigue a su sorteo); null = rotación.
  forced: 'roulette' | 'quickMoney' | null
}

function inForcedWindow(nowMs: number, nextMs: number | null, anteroomMs: number, lastMs: number | null, tailMs: number) {
  // Sin tope arriba para next: si su hora ya pasó y el backend todavía no anunció el siguiente, el
  // sorteo se está jugando.
  if (nextMs !== null && nowMs >= nextMs - anteroomMs) return true
  return lastMs !== null && nowMs >= lastMs && nowMs < lastMs + tailMs
}

// Si las dos vistas fijas se pisaran (no con el horario previsto), gana Quick Money (pedido explícito).
export function lobbyViewAt(nowMs: number, draws: LobbyDrawTimes): LobbyViewState {
  if (inForcedWindow(nowMs, draws.nextQuickMoneyDrawMs, QUICK_MONEY_ANTEROOM_MS, draws.lastQuickMoneyDrawMs, QUICK_MONEY_FORCED_TAIL_MS)) {
    return { view: 'quickMoney', forced: 'quickMoney' }
  }
  if (inForcedWindow(nowMs, draws.nextRouletteDrawMs, ROULETTE_ANTEROOM_MS, draws.lastRouletteDrawMs, ROULETTE_FORCED_TAIL_MS)) {
    return { view: 'roulette', forced: 'roulette' }
  }
  return { view: rotationViewAt(nowMs), forced: null }
}

// Resumen de ganadores (DrawSummaryHost) en modo 'rotation': dentro de lo que la vista sigue fija
// después del sorteo, cerrando DRAW_SUMMARY_EXIT_MARGIN_MS antes para que se vea la transición.
export function rotationRouletteSummaryWindow(drawStartMs: number): DrawSummaryWindow {
  return {
    startMs: drawStartMs + RESULT_HOLD_END_OFFSET_MS,
    endMs: drawStartMs + ROULETTE_FORCED_TAIL_MS - DRAW_SUMMARY_EXIT_MARGIN_MS,
  }
}

export function rotationQuickMoneySummaryWindow(drawMs: number): DrawSummaryWindow {
  return {
    startMs: drawMs + QUICK_MONEY_VIDEO_END_OFFSET_MS,
    endMs: drawMs + QUICK_MONEY_FORCED_TAIL_MS - DRAW_SUMMARY_EXIT_MARGIN_MS,
  }
}
