import type { QuickMoneyGameType } from '../types/quickMoneyBet'

// Mock TEMPORAL para el Quick Money Lobby -- no existe todavía ningún servicio/store de historial
// de sorteos para Quick Money (ver investigación: lo más cercano es adminGameEventsMockData.ts,
// que vive dentro de Admin y no tiene este shape). Reemplazar por un fetch/store real no requiere
// tocar ningún componente: QuickMoneyLobby.tsx / QuickMoneyRecentResults.tsx /
// QuickMoneyFrequencyPanel.tsx reciben esta lista por props.
//
// Un solo `QuickMoneyLobbyDraw` representa UN sorteo con resultado para Pick 3 Y Pick 4 a la vez
// (mismo gameNumber/date para ambos) -- refleja la decisión de negocio confirmada de que los dos
// juegos comparten un único draw cycle (ver store/useQuickMoneyRoundStore.ts), no dos historiales
// independientes.
export interface QuickMoneyLobbyDraw {
  gameNumber: string
  drawnAt: string
  pick3Result: number[]
  pick4Result: number[]
}

// Orden: más reciente primero. Horas relativas a "ahora" (no hardcodeadas a un pasado fijo) para
// que el mock no se sienta desactualizado con el paso del tiempo -- mismo criterio ya aplicado en
// admin-report-date-range-value (ver conversación). Separados por MINUTOS, no por días (pedido
// explícito): Quick Money sortea cada pocos minutos (ver ROUND_DURATION_SECONDS en
// useQuickMoneyRoundStore.ts), así que el historial reciente cae siempre el mismo día -- por eso
// la tabla de Recent Results muestra hora, no fecha (ver QuickMoneyRecentResults.tsx).
const DRAW_INTERVAL_MINUTES = 6

function minutesAgoIso(stepsAgo: number): string {
  const date = new Date()
  date.setMinutes(date.getMinutes() - stepsAgo * DRAW_INTERVAL_MINUTES, 0, 0)
  return date.toISOString()
}

export const QUICK_MONEY_LOBBY_DRAWS: QuickMoneyLobbyDraw[] = [
  { gameNumber: '0248', drawnAt: minutesAgoIso(0), pick3Result: [7, 3, 1], pick4Result: [2, 4, 9, 7] },
  { gameNumber: '0247', drawnAt: minutesAgoIso(1), pick3Result: [2, 8, 6], pick4Result: [9, 3, 6, 8] },
  { gameNumber: '0246', drawnAt: minutesAgoIso(2), pick3Result: [4, 6, 9], pick4Result: [4, 0, 7, 0] },
  { gameNumber: '0245', drawnAt: minutesAgoIso(3), pick3Result: [1, 5, 7], pick4Result: [5, 2, 0, 5] },
  { gameNumber: '0244', drawnAt: minutesAgoIso(4), pick3Result: [9, 0, 3], pick4Result: [9, 4, 1, 2] },
]

export function resultFor(draw: QuickMoneyLobbyDraw, gameType: QuickMoneyGameType): number[] {
  return gameType === 'pick3' ? draw.pick3Result : draw.pick4Result
}
