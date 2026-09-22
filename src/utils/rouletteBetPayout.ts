import type { BetSlipEntry } from '../types/betSlip'
import type { BetType } from '../types/rouletteBet'
import type { WheelPocket } from '../types/wheel'
import { ACTIVE_WHEEL_TYPE, getWheelOrder } from '../data/wheelOrder'

// Multiplicadores estándar de Roulette Americana -- no hay motor de payout en el backend todavía
// (ver investigación: el único "payout" existente en el proyecto es un mock de solo lectura en el
// admin de Game Events), así que esta tabla es la única fuente de verdad del frontend. Reemplazar
// acá si algún día el backend expone su propia tabla, sin tocar quién la consume.
export const BET_TYPE_PAYOUT_MULTIPLIER: Record<BetType, number> = {
  straightUp: 35,
  split: 17,
  trio: 11,
  street: 11,
  corner: 8,
  sixLine: 5,
  column: 2,
  dozen: 2,
  redBlack: 1,
  oddEven: 1,
  highLow: 1,
}

export interface BetPayout {
  // Lo que se cobra en mano si la apuesta gana (incluye el stake original) -- lo que se muestra
  // como "Payout" en Selected Bets.
  totalReturn: number
  // Solo la ganancia neta, sin el stake -- no se usa hoy en la UI pero queda disponible para quien
  // lo necesite (ej. un futuro historial de resultados) sin recalcular la fórmula en otro lado.
  profit: number
}

export function calculateBetPayout(betType: BetType, stake: number): BetPayout {
  const multiplier = BET_TYPE_PAYOUT_MULTIPLIER[betType]
  return { totalReturn: stake * (multiplier + 1), profit: stake * multiplier }
}

// totalPotentialReturn = suma de TODAS las apuestas como si cada una ganara -- imposible en la
// práctica (ej. Rojo y Negro nunca pueden ganar juntos), solo sirve como "exposición total" del
// slip. calculateMaxPotentialWin (más abajo) es el número real: el mejor caso alcanzable con un
// solo resultado de giro.
export function calculateSlipTotals(entries: BetSlipEntry[]): { totalStake: number; totalPotentialReturn: number } {
  return entries.reduce(
    (acc, entry) => {
      const { totalReturn } = calculateBetPayout(entry.betType, entry.stake)
      return { totalStake: acc.totalStake + entry.stake, totalPotentialReturn: acc.totalPotentialReturn + totalReturn }
    },
    { totalStake: 0, totalPotentialReturn: 0 },
  )
}

// Máximo realmente alcanzable en un solo giro: para cada uno de los 38 pockets posibles (fuente
// única de verdad: getWheelOrder, no hardcodear la lista acá), suma el payout de las apuestas del
// slip que efectivamente incluyen ese pocket (ver BetSelection.pockets, ya resuelto por selección
// -- nunca se recalcula qué números componen cada apuesta), y se queda con el mayor total entre
// los 38. A diferencia de calculateSlipTotals, este sí es un número que se puede llegar a cobrar.
export function calculateMaxPotentialWin(entries: BetSlipEntry[]): number {
  const allPockets = getWheelOrder(ACTIVE_WHEEL_TYPE)
  let max = 0
  for (const pocket of allPockets) {
    const totalForPocket = payoutIfPocketHits(entries, pocket)
    if (totalForPocket > max) max = totalForPocket
  }
  return max
}

function payoutIfPocketHits(entries: BetSlipEntry[], pocket: WheelPocket): number {
  return entries.reduce((sum, entry) => {
    // pockets es number[] en la mayoría de las variantes de BetSelection (nunca incluyen '00' en
    // runtime salvo straightUp/split/trio, que sí son WheelPocket[]) -- el cast es seguro, solo
    // homogeniza el tipo para poder comparar contra un WheelPocket cualquiera acá.
    const pockets = entry.selection.pockets as readonly WheelPocket[]
    if (!pockets.includes(pocket)) return sum
    return sum + calculateBetPayout(entry.betType, entry.stake).totalReturn
  }, 0)
}
