import { fetchBetsSummaryOnce } from './betsSummary'
import type { DrawSummaryMetrics, WinningTicketsDraw } from '../types/winningTickets'

// Resumen de un sorteo ya liquidado para la pantalla del lobby (WinningTicketsScreen).
//
// PARCIAL a propósito (pedido explícito: "con lo público"): el backend ya calcula todo (total
// apostado y pagado, tickets participantes y ganadores, lista de ganadores enmascarada --
// roundstats.RoundDetail) pero solo en GET /rounds/{id} del admin, que el lobby no puede llamar. Hasta
// que exista un endpoint público (pedido en docs/backend/draw-summary.md):
// - Roulette: total apostado y tickets participantes de /bets?drawNo= (los totales de ese sorteo);
//   total en premios, tickets ganadores y la lista llegan después, por páginas de GET /winners
//   (api/drawWinners.ts).
// - Quick Money: no hay nada público de sus apuestas: todo pendiente, solo el resultado.
// Cuando llegue el endpoint, se reemplaza el cuerpo de estas funciones y la pantalla no cambia.

const PENDING: DrawSummaryMetrics = { totalWagered: null, totalPaid: null, participatingTickets: null, winningTickets: null }

export async function fetchRouletteDrawSummary(drawNumber: string, result: string): Promise<WinningTicketsDraw> {
  const metrics = { ...PENDING }
  try {
    const bets = await fetchBetsSummaryOnce(drawNumber)
    metrics.totalWagered = bets.totalBetAmount
    metrics.participatingTickets = bets.playersCount
  } catch (err) {
    // Sin esto la pantalla igual se muestra, con el resultado y las métricas pendientes.
    console.warn(`[drawSummary] no se pudieron leer las apuestas del sorteo ${drawNumber}`, err)
  }
  return { game: 'roulette', drawNumber, result: { roulette: result }, metrics, tickets: null }
}

export async function fetchQuickMoneyDrawSummary(drawNumber: string, pick3: string, pick4: string): Promise<WinningTicketsDraw> {
  return { game: 'quickMoney', drawNumber, result: { pick3, pick4 }, metrics: { ...PENDING }, tickets: null }
}
