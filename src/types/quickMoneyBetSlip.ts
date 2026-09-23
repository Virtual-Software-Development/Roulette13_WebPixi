import type { QuickMoneyBetSelection } from './quickMoneyBet'

// Una fila del bet slip de Quick Money -- mismo criterio que types/betSlip.ts: `id` es la misma
// clave que produce buildQuickMoneyEntryId() (ver utils/quickMoneyPayout.ts), así la store y la
// UI nunca pueden desincronizarse sobre "qué apuesta es esta". Un solo entry por id: agregar la
// misma combinación de juego+tipo+dígitos suma a `stake` en vez de crear una fila duplicada (ver
// useQuickMoneyBetSlipStore.addBet).
export interface QuickMoneyBetSlipEntry {
  id: string
  selection: QuickMoneyBetSelection
  stake: number
}
