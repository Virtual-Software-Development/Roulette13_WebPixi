import type { QuickMoneyBetSelection, QuickMoneyBetType, QuickMoneyGameType } from '../types/quickMoneyBet'

type Translate = (key: string) => string

// Único lugar que formatea "qué apuesta es esta" para humanos -- usado tanto por QuickMoneyBetSlip
// como por QuickMoneyTicketPreviewModal, mismo criterio que rouletteBetLabel.ts.
export function getGameTypeLabel(gameType: QuickMoneyGameType, t: Translate): string {
  return t(`quickMoneyBettingView.gameType.${gameType}`)
}

export function getBetTypeLabel(betType: QuickMoneyBetType, t: Translate): string {
  return t(`quickMoneyBettingView.amountEntry.betType.${betType}`)
}

// Separados con "-" a propósito -- "123" corrido se puede leer mal contra un resultado real de
// 3 cifras (ej. sorteo 123), "1-2-3" deja claro que son 3 dígitos elegidos, no un número de 123.
export function formatDigits(digits: number[]): string {
  return digits.join('-')
}

export function buildQuickMoneyEntryId(selection: QuickMoneyBetSelection): string {
  return `${selection.gameType}:${selection.betType}:${selection.digits.join('')}`
}
