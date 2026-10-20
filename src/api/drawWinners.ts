import type { WinningTicket, WinningTicketGame, WinningTicketsDraw } from '../types/winningTickets'

// Lista de tickets ganadores de un sorteo, entregada POR PÁGINAS: la pantalla (WinningTicketsScreen)
// se abre con la primera y las demás se van agregando al final mientras la lista ya se desplaza. Así
// un sorteo con miles de ganadores (una apuesta exterior que gana en gran parte de la flota) se ve al
// instante, sin esperar a bajar la lista entera.
//
// Todavía no hay endpoint público para el lobby (ver api/drawSummary.ts): winnersSourceFor devuelve
// null -- la pantalla muestra "lista pendiente" -- salvo con el mock de carga activado por URL
// (?mockWinners=5000, ver MOCK_QUERY). Cuando llegue el endpoint, se agrega acá una fuente que pida
// las páginas al backend; la pantalla y DrawSummaryHost no cambian.

export interface WinnersPage {
  // Tickets de esta página, en el mismo orden global (mayor a menor premio): se agregan al final.
  tickets: WinningTicket[]
  // Totales del sorteo completo -- el backend los conoce desde la primera página.
  total: number
  totalPaid: number
}

export type WinnersSource = (signal: AbortSignal) => AsyncGenerator<WinnersPage>

export interface MockWinnersOptions {
  total: number
  pageSize: number
  // Latencia de la primera página y entre páginas siguientes.
  firstPageDelayMs: number
  pageDelayMs: number
}

export const MOCK_WINNERS_DEFAULTS: Omit<MockWinnersOptions, 'total'> = {
  pageSize: 500,
  firstPageDelayMs: 150,
  pageDelayMs: 250,
}

// ?mockWinners=5000[&mockWinnersPage=500][&mockWinnersDelay=250][&mockWinnersFirst=150]
const MOCK_QUERY = {
  total: 'mockWinners',
  pageSize: 'mockWinnersPage',
  pageDelayMs: 'mockWinnersDelay',
  firstPageDelayMs: 'mockWinnersFirst',
} as const

function positiveNumber(value: string | null, fallback: number): number {
  const parsed = Number(value)
  return value !== null && Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export function mockWinnersOptionsFromQuery(search: string): MockWinnersOptions | null {
  const query = new URLSearchParams(search)
  const total = Number(query.get(MOCK_QUERY.total))
  if (!Number.isInteger(total) || total <= 0) return null
  return {
    total,
    pageSize: Math.max(1, positiveNumber(query.get(MOCK_QUERY.pageSize), MOCK_WINNERS_DEFAULTS.pageSize)),
    pageDelayMs: positiveNumber(query.get(MOCK_QUERY.pageDelayMs), MOCK_WINNERS_DEFAULTS.pageDelayMs),
    firstPageDelayMs: positiveNumber(query.get(MOCK_QUERY.firstPageDelayMs), MOCK_WINNERS_DEFAULTS.firstPageDelayMs),
  }
}

export function winnersSourceFor(draw: WinningTicketsDraw): WinnersSource | null {
  const mock = mockWinnersOptionsFromQuery(window.location.search)
  if (mock) return mockWinnersSource(draw, mock)
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

// --- Mock: una apuesta exterior (rojo/negro, par/impar...) que gana en gran parte de la flota ---

// PRNG con semilla (mulberry32): el mismo sorteo genera la misma lista en todas las máquinas.
function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Apuestas típicas de una exterior (paga 1 a 1: cobra apuesta + premio = 2x); unos pocos tickets
// suman además un pleno ganador.
const OUTSIDE_STAKES = [1, 2, 5, 10, 20, 25, 50, 100]
const MOCK_TERMINALS = 240

export function generateMockWinners(draw: Pick<WinningTicketsDraw, 'game' | 'drawNumber'>, total: number): WinningTicket[] {
  const seed = Number(draw.drawNumber.replace(/\D/g, '')) || 1
  const random = seededRandom(seed * 7919 + (draw.game === 'roulette' ? 1 : 2))
  const tickets: WinningTicket[] = []
  for (let index = 0; index < total; index++) {
    const stake = OUTSIDE_STAKES[Math.floor(random() * OUTSIDE_STAKES.length)]
    const straightUp = random() < 0.02 ? Math.ceil(random() * 10) * 36 : 0
    const game: WinningTicketGame = draw.game === 'roulette' ? 'roulette' : random() < 0.5 ? 'pick3' : 'pick4'
    tickets.push({
      // Único por sorteo: número de sorteo + índice, con relleno pseudoaleatorio delante.
      code: `${Math.floor(random() * 9000) + 1000}${String(seed).padStart(4, '0')}${String(index).padStart(5, '0')}`,
      game,
      terminal: `T-${String(Math.floor(random() * MOCK_TERMINALS) + 1).padStart(3, '0')}`,
      prize: stake * 2 + straightUp,
    })
  }
  return tickets.sort((a, b) => b.prize - a.prize)
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason)
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}

export function mockWinnersSource(draw: Pick<WinningTicketsDraw, 'game' | 'drawNumber'>, options: MockWinnersOptions): WinnersSource {
  return async function* (signal) {
    const all = generateMockWinners(draw, options.total)
    const totalPaid = all.reduce((sum, ticket) => sum + ticket.prize, 0)
    for (let offset = 0; offset < all.length; offset += options.pageSize) {
      await wait(offset === 0 ? options.firstPageDelayMs : options.pageDelayMs, signal)
      yield { tickets: all.slice(offset, offset + options.pageSize), total: all.length, totalPaid }
    }
  }
}
