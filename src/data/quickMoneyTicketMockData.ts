import type { QuickMoneyBetSlipEntry } from '../types/quickMoneyBetSlip'
import type { QuickMoneyTicket } from '../types/quickMoneyTicket'
import { calculateMaxPotentialWin, calculateSlipTotals } from '../utils/quickMoneyPayout'

// Sin backend de tickets/impresión todavía -- mismo criterio setTimeout que
// data/bettingTicketMockData.ts (Roulette). Reemplazar por un POST real (y un job de impresión
// real) sin tocar QuickMoneyCashierFooter/QuickMoneyTicketPreviewModal.
const ACTION_DURATION_MS = 700

function generateTicketNumber(): string {
  const random = Math.floor(Math.random() * 1_000_000)
  return `QM-${String(random).padStart(6, '0')}`
}

export function buildTicketPreview(
  entries: QuickMoneyBetSlipEntry[],
  drawNumbers: Partial<Record<'pick3' | 'pick4', string>>,
): QuickMoneyTicket {
  const { totalStake } = calculateSlipTotals(entries)
  // Máximo realmente cobrable (Pick 3 + Pick 4 pueden ganar los dos a la vez, ver
  // calculateMaxPotentialWin) -- mismo criterio que el ticket de Roulette.
  const totalPotentialReturn = calculateMaxPotentialWin(entries)
  return {
    id: `qm-ticket-${Date.now()}`,
    ticketNumber: generateTicketNumber(),
    drawNumbers,
    createdAt: new Date().toISOString(),
    entries,
    totalStake,
    totalPotentialReturn,
    status: 'pending',
  }
}

export function issueTicket(ticket: QuickMoneyTicket): Promise<QuickMoneyTicket> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ...ticket, status: 'issued' }), ACTION_DURATION_MS)
  })
}
