import type { QuickMoneyBetSlipEntry } from '../types/quickMoneyBetSlip'
import type { QuickMoneyBetType, QuickMoneyGameType } from '../types/quickMoneyBet'

// Multiplicadores mock tipo Pick 3/Pick 4 real -- no hay motor de payout en el backend todavía
// (mismo caso que BET_TYPE_PAYOUT_MULTIPLIER en rouletteBetPayout.ts). SIMPLIFICADO a propósito:
// un juego de números real hace variar el pago de Box/Combo según cuántos dígitos se repiten en
// la combinación elegida (ej. Box de 3 dígitos únicos paga distinto que uno con un par repetido)
// -- acá se usa un valor plano por (gameType, betType) en vez de esa tabla combinatoria completa,
// documentado como la simplificación que es. Único lugar a afinar el día que exista un motor real.
export const QUICK_MONEY_PAYOUT_MULTIPLIER: Record<QuickMoneyGameType, Record<QuickMoneyBetType, number>> = {
  pick3: { straight: 500, box: 80, combo: 160 },
  pick4: { straight: 5000, box: 200, combo: 400 },
}

export interface QuickMoneyBetPayout {
  totalReturn: number
  profit: number
}

export function calculateBetPayout(gameType: QuickMoneyGameType, betType: QuickMoneyBetType, stake: number): QuickMoneyBetPayout {
  const multiplier = QUICK_MONEY_PAYOUT_MULTIPLIER[gameType][betType]
  return { totalReturn: stake * (multiplier + 1), profit: stake * multiplier }
}

// totalPotentialReturn = suma de TODAS las apuestas como si cada una ganara -- mismo criterio (y
// misma limitación) que calculateSlipTotals en rouletteBetPayout.ts.
export function calculateSlipTotals(entries: QuickMoneyBetSlipEntry[]): { totalStake: number; totalPotentialReturn: number } {
  return entries.reduce(
    (acc, entry) => {
      const { totalReturn } = calculateBetPayout(entry.selection.gameType, entry.selection.betType, entry.stake)
      return { totalStake: acc.totalStake + entry.stake, totalPotentialReturn: acc.totalPotentialReturn + totalReturn }
    },
    { totalStake: 0, totalPotentialReturn: 0 },
  )
}

// Máximo realmente alcanzable con los resultados de UN sorteo de Pick 3 y UN sorteo de Pick 4 --
// mismo criterio que calculateMaxPotentialWin en rouletteBetPayout.ts, adaptado a este dominio:
// Pick 3 y Pick 4 son sorteos independientes (pueden ganar los dos a la vez), pero dentro de un
// mismo gameType solo puede salir UN resultado exacto por sorteo, así que dos entries del mismo
// gameType son mutuamente excluyentes entre sí (nunca pueden ganar juntas). Se agrupa por
// gameType, se toma el mayor totalReturn dentro de cada grupo, y se suma entre grupos.
export function calculateMaxPotentialWin(entries: QuickMoneyBetSlipEntry[]): number {
  const bestPerGameType: Partial<Record<QuickMoneyGameType, number>> = {}
  for (const entry of entries) {
    const { totalReturn } = calculateBetPayout(entry.selection.gameType, entry.selection.betType, entry.stake)
    const current = bestPerGameType[entry.selection.gameType] ?? 0
    if (totalReturn > current) bestPerGameType[entry.selection.gameType] = totalReturn
  }
  return Object.values(bestPerGameType).reduce((sum: number, value) => sum + (value ?? 0), 0)
}
