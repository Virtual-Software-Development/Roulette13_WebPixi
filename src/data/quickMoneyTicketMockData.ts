import type { QuickMoneyBetSlipEntry } from '../types/quickMoneyBetSlip'
import type { QuickMoneyTicket } from '../types/quickMoneyTicket'
import { calculateMaxPotentialWin, calculateSlipTotals } from '../utils/quickMoneyPayout'
import { newTicketCode } from '../api/terminalTicket'

// Arma el Ticket Preview de Cashier Mode. El número es el código con el que Issue Ticket lo envía
// al backend (ver QuickMoneyCashierFooter), así el impreso y el guardado coinciden. Todavía no hay
// job de impresión real.
function generateTicketNumber(): string {
  return `QM${newTicketCode()}`
}

export function buildTicketPreview(
  entries: QuickMoneyBetSlipEntry[],
  drawNumbers: Partial<Record<'pick3' | 'pick4', string>>,
): QuickMoneyTicket {
  const { totalStake } = calculateSlipTotals(entries)
  // Máximo cobrable: cada apuesta puede ganar por su cuenta (ver calculateMaxPotentialWin).
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
