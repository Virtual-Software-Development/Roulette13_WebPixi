import type { WinningTicket, WinningTicketsDraw } from '../types/winningTickets'

// Lista de tickets ganadores de un sorteo, entregada POR PÁGINAS: la pantalla (WinningTicketsScreen)
// se abre con la primera y las demás se van agregando al final mientras la lista ya se desplaza. Así
// un sorteo con miles de ganadores (una apuesta exterior que gana en gran parte de la flota) se ve al
// instante, sin esperar a bajar la lista entera.
//
// Todavía no hay endpoint público para el lobby (ver api/drawSummary.ts): winnersSourceFor devuelve
// null y la pantalla muestra "lista pendiente". Cuando llegue el endpoint, se agrega acá una fuente
// que pida las páginas al backend; la pantalla y DrawSummaryHost no cambian.

export interface WinnersPage {
  // Tickets de esta página, en el mismo orden global (mayor a menor premio): se agregan al final.
  tickets: WinningTicket[]
  // Totales del sorteo completo -- el backend los conoce desde la primera página.
  total: number
  totalPaid: number
}

export type WinnersSource = (signal: AbortSignal) => AsyncGenerator<WinnersPage>

// La fuente real usará game y drawNumber del sorteo para pedir sus páginas.
export function winnersSourceFor(_draw: WinningTicketsDraw): WinnersSource | null {
  return null
}

// Va armando la lista con cada página que llega y avisa con el draw actualizado: la primera llamada
// es inmediata, con la lista vacía y "cargando" (ticketsComplete false), así la pantalla abre sin
// esperar a la red. Si la fuente falla a mitad, se queda con lo recibido (o "pendiente" si no llegó
// nada). Abortar `signal` corta sin más avisos.
export async function streamWinners(
  draw: WinningTicketsDraw,
  source: WinnersSource,
  signal: AbortSignal,
  onUpdate: (draw: WinningTicketsDraw) => void,
): Promise<void> {
  let current: WinningTicketsDraw = { ...draw, tickets: [], ticketsComplete: false }
  onUpdate(current)
  try {
    for await (const page of source(signal)) {
      if (signal.aborted) return
      const tickets = current.tickets!.concat(page.tickets)
      current = {
        ...current,
        tickets,
        ticketsComplete: tickets.length >= page.total,
        metrics: { ...current.metrics, winningTickets: page.total, totalPaid: page.totalPaid },
      }
      onUpdate(current)
    }
    if (!signal.aborted && current.ticketsComplete === false) onUpdate({ ...current, ticketsComplete: true })
  } catch (err) {
    if (signal.aborted) return
    console.warn(`[drawWinners] la lista de ganadores del sorteo ${draw.drawNumber} se cortó`, err)
    onUpdate(current.tickets!.length > 0 ? { ...current, ticketsComplete: true } : { ...current, tickets: null, ticketsComplete: true })
  }
}
