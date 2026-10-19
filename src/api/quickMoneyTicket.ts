import type { QuickMoneyBetSlipEntry } from '../types/quickMoneyBetSlip'
import type { QuickMoneyBetSelection } from '../types/quickMoneyBet'
import { postTicket, type TicketBet } from './terminalTicket'

// Quick Money bets as the backend takes them (quick-money-backend internal/tickets/api.go): the
// bet type code is the same as the frontend's and selection is the digits bet on, in order ("072").
// Quick Money is one game ("quick_money"), so a bet doesn't say pick3 or pick4.
export function toQuickMoneyTicketBet(selection: QuickMoneyBetSelection, stake: number): TicketBet {
  return { betType: selection.betType, selection: selection.digits.join(''), amount: stake }
}

// Places the slip as one ticket on Quick Money draw eventId. Throws with the backend's message if
// the ticket is rejected (e.g. betting closed in the meantime).
export async function placeQuickMoneyTicket(entries: QuickMoneyBetSlipEntry[], eventId: number, ticketCode?: string): Promise<void> {
  await postTicket(
    'quick_money',
    eventId,
    entries.map((entry) => toQuickMoneyTicketBet(entry.selection, entry.stake)),
    ticketCode,
  )
}
