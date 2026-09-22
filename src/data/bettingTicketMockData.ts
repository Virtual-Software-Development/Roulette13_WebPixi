import type { BetSlipEntry } from '../types/betSlip'
import type { BettingTicket } from '../types/bettingTicket'
import { calculateMaxPotentialWin, calculateSlipTotals } from '../utils/rouletteBetPayout'

// Sin backend de tickets/impresión todavía (cero precedente en el proyecto, ver investigación).
// buildTicketPreview/issueTicket simulan el flujo Confirm -> Preview -> Issue con el mismo
// criterio setTimeout ya establecido en el resto del Admin (ver simulateAction en UsersPage.tsx).
// Reemplazar por un POST real (y un job de impresión real) sin tocar CashierPanel/
// TicketPreviewModal.
const ACTION_DURATION_MS = 700

function generateTicketNumber(): string {
  const random = Math.floor(Math.random() * 1_000_000)
  return `TCK-${String(random).padStart(6, '0')}`
}

export function buildTicketPreview(entries: BetSlipEntry[], drawNumber: string): BettingTicket {
  const { totalStake } = calculateSlipTotals(entries)
  // Máximo realmente cobrable con UN solo resultado de giro, no la suma de "si ganara todo" (ver
  // calculateMaxPotentialWin en rouletteBetPayout.ts) -- mismo criterio que Selected Bets.
  const totalPotentialReturn = calculateMaxPotentialWin(entries)
  return {
    id: `ticket-${Date.now()}`,
    ticketNumber: generateTicketNumber(),
    drawNumber,
    createdAt: new Date().toISOString(),
    entries,
    totalStake,
    totalPotentialReturn,
    status: 'pending',
  }
}

export function issueTicket(ticket: BettingTicket): Promise<BettingTicket> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ...ticket, status: 'issued' }), ACTION_DURATION_MS)
  })
}
