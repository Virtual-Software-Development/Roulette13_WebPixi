import type { QuickMoneyBetSlipEntry } from '../types/quickMoneyBetSlip'
import type { QuickMoneyBetDraw, QuickMoneyBetSelection } from '../types/quickMoneyBet'

// Reglas de premio de Quick Money -- port de QuickMoneyPrizeCalc.GetMultiplierFromFormatNumberBets
// (script C# de referencia). Una apuesta de 1 a 4 dígitos se evalúa contra el resultado del Pick 3
// (3 dígitos) y del Pick 4 (4 dígitos) del mismo sorteo:
//
//   Directo (2 dígitos): los tres "premios" son pares de dígitos --
//     1.º = últimos 2 del Pick 3, 2.º = primeros 2 del Pick 4, 3.º = últimos 2 del Pick 4.
//   Palé (4 dígitos): dos de esos premios juntos -- 1.º+2.º o 1.º+3.º pagan 1100, 2.º+3.º paga 100.
//
// El premio es multiplicador × monto apostado (igual que el script).

const MULTIPLIER = {
  single: 9,
  directoFirst: 56,
  directoSecond: 12,
  directoThird: 4,
  bolita: 75,
  straight3: 600,
  box3: 100,
  straight4: 5000,
  paleFirstPair: 1100,
  paleSecondThird: 100,
} as const

const join = (digits: readonly number[]) => digits.join('')
const sortedKey = (digits: readonly number[]) => [...digits].sort((a, b) => a - b).join('')

// Multiplicador que paga una apuesta para un resultado concreto (0 = no gana).
export function getPrizeMultiplier(selection: QuickMoneyBetSelection, pick3: readonly number[], pick4: readonly number[]): number {
  const input = join(selection.digits)
  const directFirst = `${pick3[1]}${pick3[2]}`
  const directSecond = `${pick4[0]}${pick4[1]}`
  const directThird = `${pick4[2]}${pick4[3]}`

  switch (selection.digits.length) {
    case 1:
      if (selection.betType === 'single' && pick3.some((d) => String(d) === input)) return MULTIPLIER.single
      return 0
    case 2:
      if (selection.betType === 'directo') {
        if (input === directFirst) return MULTIPLIER.directoFirst
        if (input === directSecond) return MULTIPLIER.directoSecond
        if (input === directThird) return MULTIPLIER.directoThird
      }
      if (selection.betType === 'bolita') {
        const firstTwo = `${pick3[0]}${pick3[1]}`
        const lastTwo = `${pick3[1]}${pick3[2]}`
        if (input === firstTwo || input === lastTwo) return MULTIPLIER.bolita
      }
      return 0
    case 3:
      if (selection.betType === 'straight' && input === join(pick3)) return MULTIPLIER.straight3
      if (selection.betType === 'box' && sortedKey(selection.digits) === sortedKey(pick3)) return MULTIPLIER.box3
      return 0
    case 4:
      if (selection.betType === 'straight' && input === join(pick4)) return MULTIPLIER.straight4
      if (selection.betType === 'pale') {
        if (input === directFirst + directSecond || input === directFirst + directThird) return MULTIPLIER.paleFirstPair
        if (input === directSecond + directThird) return MULTIPLIER.paleSecondThird
      }
      return 0
    default:
      return 0
  }
}

// Mejor multiplicador posible para la apuesta -- base de "Potential Win" antes del sorteo.
export function getMaxMultiplier(selection: QuickMoneyBetSelection): number {
  switch (selection.betType) {
    case 'single':
      return MULTIPLIER.single
    case 'directo':
      return MULTIPLIER.directoFirst
    case 'bolita':
      return MULTIPLIER.bolita
    case 'straight':
      return selection.digits.length === 4 ? MULTIPLIER.straight4 : MULTIPLIER.straight3
    case 'box':
      return MULTIPLIER.box3
    case 'pale':
      return MULTIPLIER.paleFirstPair
  }
}

// Qué sorteo decide la apuesta (ver QuickMoneyBetDraw).
export function getBetDraw(selection: QuickMoneyBetSelection): QuickMoneyBetDraw {
  if (selection.betType === 'directo' || selection.betType === 'pale') return 'both'
  if (selection.betType === 'straight' && selection.digits.length === 4) return 'pick4'
  return 'pick3'
}

export interface QuickMoneyBetPayout {
  // Premio máximo posible (multiplicador × monto, como el script).
  maxPrize: number
}

export function calculateBetPayout(selection: QuickMoneyBetSelection, stake: number): QuickMoneyBetPayout {
  return { maxPrize: stake * getMaxMultiplier(selection) }
}

export function calculateSlipTotals(entries: QuickMoneyBetSlipEntry[]): { totalStake: number; totalPotentialReturn: number } {
  return entries.reduce(
    (acc, entry) => ({
      totalStake: acc.totalStake + entry.stake,
      totalPotentialReturn: acc.totalPotentialReturn + calculateBetPayout(entry.selection, entry.stake).maxPrize,
    }),
    { totalStake: 0, totalPotentialReturn: 0 },
  )
}

// Todas las apuestas se evalúan contra el mismo sorteo y cada una puede ganar por su cuenta (ej.
// Straight y Box sobre los mismos dígitos), así que el máximo cobrable es la suma de los máximos.
export function calculateMaxPotentialWin(entries: QuickMoneyBetSlipEntry[]): number {
  return calculateSlipTotals(entries).totalPotentialReturn
}
