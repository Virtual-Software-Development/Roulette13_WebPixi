import type { BetSlipEntry } from '../types/betSlip'
import type { BetSelection } from '../types/rouletteBet'
import { fetchCurrentEvent, postTicket, type TicketBet } from './terminalTicket'

// TEST ONLY -- sends the roulette bet slip as a real ticket (POST /api/tickets, see
// terminalTicket.ts) so bets reach the backend and show up in the lobby's Live Table Bets panel.
// Used by PlayerPanel.tsx.

// Backend bet codes (bet_type.code_name, see quick-money-backend internal/tickets/api.go) for each
// board selection.
// Columns and dozens are derived from their numbers so both sides always agree on which is which:
// column "1" = 1, 4, 7 ... 34; dozen "1" = 1-12.
export function toTicketBet(selection: BetSelection, stake: number): TicketBet {
  const bet = (betType: string, selection: string): TicketBet => ({ betType, selection, amount: stake })
  const numbers = (pockets: readonly (number | '00')[]) => pockets.map(String).join(',')

  switch (selection.type) {
    case 'straightUp':
      return bet('straight', numbers(selection.pockets))
    case 'split':
      return bet('split', numbers(selection.pockets))
    case 'trio':
    case 'street':
      return bet('street', numbers(selection.pockets))
    case 'corner':
      return bet('corner', numbers(selection.pockets))
    case 'sixLine':
      return bet('six_line', numbers(selection.pockets))
    case 'column': {
      const remainder = selection.pockets[0] % 3
      return bet('column', remainder === 0 ? '3' : String(remainder))
    }
    case 'dozen': {
      const first = selection.pockets[0]
      return bet('dozen', first <= 12 ? '1' : first <= 24 ? '2' : '3')
    }
    case 'redBlack':
      return bet('red_black', selection.color === 'red' ? 'red' : 'black')
    case 'oddEven':
      return bet('even_odd', selection.parity === 'even' ? 'even' : 'odd')
    case 'highLow':
      return bet('low_high', selection.range === 'low' ? 'low' : 'high')
  }
}

// Places the slip as one ticket on the roulette round currently open for betting. Throws with
// the backend's message if the round can't be found or the ticket is rejected.
export async function placeRouletteTicket(entries: BetSlipEntry[]): Promise<void> {
  const event = await fetchCurrentEvent('roulette')
  if (!event) throw new Error('no roulette round open for betting')
  await postTicket(
    'roulette',
    event.id,
    entries.map((entry) => toTicketBet(entry.selection, entry.stake)),
  )
}
