import type { QuickMoneyBetSlipEntry } from './quickMoneyBetSlip'

export type QuickMoneyTicketStatus = 'pending' | 'issued'

// Mismo shape que types/bettingTicket.ts (BettingTicket) -- sin backend de tickets todavía (ver
// data/quickMoneyTicketMockData.ts), es lo que necesita el Ticket Preview de Cashier Mode para
// mostrarse completo antes de emitir. `drawNumbers` en vez de un solo `drawNumber`: un ticket
// puede llevar apuestas de Pick 3 y Pick 4 a la vez (pestaña "Play Both") -- aunque ambos juegos
// comparten hoy el mismo draw cycle (ver store/useQuickMoneyRoundStore.ts), se etiqueta cada
// grupo por separado para no acoplar el shape del ticket a esa decisión de negocio.
export interface QuickMoneyTicket {
  id: string
  ticketNumber: string
  drawNumbers: Partial<Record<'pick3' | 'pick4', string>>
  createdAt: string
  entries: QuickMoneyBetSlipEntry[]
  totalStake: number
  totalPotentialReturn: number
  status: QuickMoneyTicketStatus
}
