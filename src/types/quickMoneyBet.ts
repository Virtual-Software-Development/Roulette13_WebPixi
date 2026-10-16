// Fuente única de verdad de "qué es esta apuesta de Quick Money". Una apuesta es de 1 a 4 dígitos
// (0-9) y un tipo de jugada; se evalúa contra los DOS sorteos a la vez (Pick 3 y Pick 4), según las
// reglas de QuickMoneyPrizeCalc (ver utils/quickMoneyPayout.ts). QuickMoneyGameType sigue
// existiendo porque el lobby muestra los dos sorteos por separado.
export type QuickMoneyGameType = 'pick3' | 'pick4'

// Cuántos dígitos tiene el resultado de cada sorteo.
export const QUICK_MONEY_DIGIT_COUNT: Record<QuickMoneyGameType, number> = {
  pick3: 3,
  pick4: 4,
}

export type QuickMoneyBetType = 'single' | 'directo' | 'bolita' | 'straight' | 'box' | 'pale'

export const QUICK_MONEY_MIN_DIGITS = 1
export const QUICK_MONEY_MAX_DIGITS = 4

// Tipos de jugada disponibles según cuántos dígitos se cargaron -- mismo criterio que
// GetMultiplierFromFormatNumberBets: cada tipo solo existe para un largo concreto.
export const BET_TYPES_BY_DIGIT_COUNT: Record<number, QuickMoneyBetType[]> = {
  1: ['single'],
  2: ['directo', 'bolita'],
  3: ['straight', 'box'],
  4: ['straight', 'pale'],
}

export function betTypesForDigitCount(count: number): QuickMoneyBetType[] {
  return BET_TYPES_BY_DIGIT_COUNT[count] ?? []
}

// Todos los tipos de jugada, en el orden en que se muestran.
export const QUICK_MONEY_BET_TYPES: QuickMoneyBetType[] = ['single', 'directo', 'bolita', 'straight', 'box', 'pale']

// Cuántos dígitos lleva cada tipo (inverso de BET_TYPES_BY_DIGIT_COUNT): Straight va con 3 o 4.
export function digitCountsForBetType(betType: QuickMoneyBetType): number[] {
  return Object.entries(BET_TYPES_BY_DIGIT_COUNT)
    .filter(([, types]) => types.includes(betType))
    .map(([count]) => Number(count))
}

export interface QuickMoneyBetSelection {
  betType: QuickMoneyBetType
  // 1 a 4 dígitos, en el orden en que se cargaron.
  digits: number[]
}

// Qué sorteo decide cada apuesta -- para el color/etiqueta de la fila en el bet slip y el ticket.
// 'both' = Directo/Palé, que comparan pares tomados del Pick 3 y del Pick 4.
export type QuickMoneyBetDraw = QuickMoneyGameType | 'both'
