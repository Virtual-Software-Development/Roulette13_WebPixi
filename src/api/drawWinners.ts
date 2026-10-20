import type { WinningTicket, WinningTicketsDraw } from '../types/winningTickets'
import { env } from '../config/env'

// Lista de tickets ganadores de un sorteo, entregada POR PÁGINAS: la pantalla (WinningTicketsScreen)
// se abre con la primera y las demás se van agregando al final mientras la lista ya se desplaza. Así
// un sorteo con miles de ganadores (una apuesta exterior que gana en gran parte de la flota) se ve al
// instante, sin esperar a bajar la lista entera.
//
// Las páginas salen de GET /api/winners del backend (quick-money-backend: lobbyapi/winners.go), ya
// ordenadas de mayor a menor premio y con el código enmascarado. Sin la terminal de cada ticket: con
// el X-Terminal-Token de esta máquina el backend marca `local` los vendidos acá.

export interface WinnersPage {
  // Tickets de esta página, en el mismo orden global (mayor a menor premio): se agregan al final.
  tickets: WinningTicket[]
  // Totales del sorteo completo -- el backend los conoce desde la primera página.
  total: number
  totalPaid: number
}

export type WinnersSource = (signal: AbortSignal) => AsyncGenerator<WinnersPage>

const PAGE_SIZE = 200
// Una página que falla (red, o 409: la ronda todavía no terminó de liquidarse, corre unos segundos
// después del sorteo) se reintenta; agotados los reintentos la lista se queda con lo recibido.
const PAGE_RETRIES = 8
const RETRY_DELAY_MS = 1000

interface WinnersResponse {
  total: number
  totalPrize: number
  tickets: { ticketCode: string; local: boolean; prizeAmount: number }[]
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    }, { once: true })
  })
}

async function fetchWinnersPage(game: string, drawNumber: string, offset: number, signal: AbortSignal): Promise<WinnersResponse> {
  const query = new URLSearchParams({ game, drawNo: drawNumber, offset: String(offset), limit: String(PAGE_SIZE) })
  let lastError: unknown
  for (let attempt = 0; attempt <= PAGE_RETRIES; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAY_MS, signal)
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${env.apiKey}` }
      if (env.terminalToken) headers['X-Terminal-Token'] = env.terminalToken
      const res = await fetch(`/api/winners?${query}`, { signal, headers })
      if (res.ok) return await res.json()
      lastError = new Error(`winners request failed: ${res.status}`)
      // 400/404 no se arreglan reintentando.
      if (res.status !== 409 && res.status < 500) break
    } catch (err) {
      if (signal.aborted) throw err
      lastError = err
    }
  }
  throw lastError
}

// Pide las páginas en serie: cada una sigue donde terminó la anterior (el backend ordena siempre igual
// y una ronda liquidada ya no cambia, así que no hay huecos ni repetidos).
export function winnersSourceFor(draw: WinningTicketsDraw): WinnersSource | null {
  const game = draw.game === 'roulette' ? 'roulette' : 'lottery'
  return async function* (signal) {
    let offset = 0
    for (;;) {
      const page = await fetchWinnersPage(game, draw.drawNumber, offset, signal)
      const tickets: WinningTicket[] = page.tickets.map((ticket) => ({
        code: ticket.ticketCode,
        local: ticket.local,
        prize: ticket.prizeAmount,
      }))
      yield { tickets, total: page.total, totalPaid: page.totalPrize }
      offset += tickets.length
      if (tickets.length === 0 || offset >= page.total) return
    }
  }
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
