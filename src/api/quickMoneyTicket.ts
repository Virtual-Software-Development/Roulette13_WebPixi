import type { QuickMoneyBetSlipEntry } from '../types/quickMoneyBetSlip'
import type { QuickMoneyBetSelection } from '../types/quickMoneyBet'
import { postTicket, type TicketBet } from './terminalTicket'

// Quick Money bets as the backend takes them (quick-money-backend internal/tickets/lottery.go): the
// bet type code is the same as the frontend's and valor is the digits bet on, in order ("072").
// Quick Money is one game ("lottery"), so a bet no longer says pick3 or pick4.
export function toQuickMoneyTicketBet(selection: QuickMoneyBetSelection, stake: number): TicketBet {
  return { tipoApuesta: selection.betType, valor: selection.digits.join(''), montoApostado: stake }
}

// Places the slip as one ticket on Quick Money draw eventId. Throws with the backend's message if
// the ticket is rejected (e.g. betting closed in the meantime).
export async function placeQuickMoneyTicket(entries: QuickMoneyBetSlipEntry[], eventId: number, codigoTicket?: string): Promise<void> {
  await postTicket(
    'lottery',
    eventId,
    entries.map((entry) => toQuickMoneyTicketBet(entry.selection, entry.stake)),
    codigoTicket,
  )
}
