// Fuente única de verdad de "qué es esta apuesta de Quick Money" -- mismo criterio que
// types/rouletteBet.ts, pero el dominio acá es mucho más simple (no hay geometría de tablero):
// una apuesta es solo un juego (Pick 3 / Pick 4), un tipo (Straight/Box/Combo) y una lista de
// dígitos elegidos por el jugador.
export type QuickMoneyGameType = 'pick3' | 'pick4'
export type QuickMoneyBetType = 'straight' | 'box' | 'combo'

export const QUICK_MONEY_DIGIT_COUNT: Record<QuickMoneyGameType, number> = {
  pick3: 3,
  pick4: 4,
}

export interface QuickMoneyBetSelection {
  gameType: QuickMoneyGameType
  betType: QuickMoneyBetType
  digits: number[]
}
