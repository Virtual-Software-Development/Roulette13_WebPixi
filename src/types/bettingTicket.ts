import type { BetSlipEntry } from './betSlip'

export type TicketStatus = 'pending' | 'issued'

// Sin backend de tickets todavía (ver data/bettingTicketMockData.ts) -- esta forma es lo que
// necesita el Ticket Preview de Cashier Mode para mostrarse completo antes de emitir.
export interface BettingTicket {
  id: string
  ticketNumber: string
  drawNumber: string
  createdAt: string
  entries: BetSlipEntry[]
  totalStake: number
  totalPotentialReturn: number
  status: TicketStatus
}
