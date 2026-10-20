import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextSegment, renderRange, rowAt } from '../utils/winningTicketsScroll'
import { streamWinners, winnersSourceFor, type WinnersSource } from '../api/drawWinners'
import type { WinningTicket, WinningTicketsDraw } from '../types/winningTickets'

const HOLD = 4_000
const TOTAL = 42_000

describe('winning tickets auto-scroll', () => {
  it('waits for the initial hold, then reaches the last row when the final hold starts', () => {
    const segment = nextSegment(null, 0, 100, HOLD, TOTAL)!
    expect(rowAt(segment, 0)).toBe(0)
    expect(rowAt(segment, HOLD)).toBe(0)
    expect(rowAt(segment, TOTAL - HOLD)).toBe(100)
    expect(rowAt(segment, TOTAL)).toBe(100)
  })

  it('a new page continues from the current row, without a jump, and still ends on time', () => {
    const first = nextSegment(null, 0, 100, HOLD, TOTAL)!
    const at = 10_000
    const before = rowAt(first, at)
    const second = nextSegment(first, at, 5_000, HOLD, TOTAL)!
    expect(rowAt(second, at)).toBeCloseTo(before)
    expect(rowAt(second, TOTAL - HOLD)).toBe(5_000)
  })

  it('a page that arrives during the final hold still scrolls (briefly) instead of jumping', () => {
    const first = nextSegment(null, 0, 100, HOLD, TOTAL)!
    const at = TOTAL - 2_000
    const second = nextSegment(first, at, 600, HOLD, TOTAL)!
    expect(rowAt(second, at)).toBe(100)
    expect(second.endMs).toBeLessThanOrEqual(TOTAL)
    expect(second.endMs).toBeGreaterThan(at)
  })

  it('no segment when the list fits without scrolling', () => {
    expect(nextSegment(null, 0, -3, HOLD, TOTAL)).toBeNull()
  })

  it('render range covers the visible rows plus what enters in the lookahead', () => {
    expect(renderRange(100.4, 160.2, 10, 5_000, 4)).toEqual([96, 175])
    expect(renderRange(0, 0, 10, 5, 4)).toEqual([0, 5])
    expect(renderRange(4_995, 4_995, 10, 5_000, 4)).toEqual([4_991, 5_000])
  })
})

describe('winners delivered by pages', () => {
  const base: WinningTicketsDraw = {
    game: 'roulette',
    drawNumber: '0092',
    result: { roulette: '7' },
    metrics: { totalWagered: null, totalPaid: null, participatingTickets: null, winningTickets: null },
    tickets: null,
  }
  const tickets: WinningTicket[] = Array.from({ length: 5_000 }, (_, index) => ({
    code: String(index).padStart(12, '0'),
    machineId: 1,
    terminal: 'T-001',
    prize: 10,
  }))

  // Páginas de 500; con failAfter, la fuente se corta después de esa cantidad de páginas.
  function pagedSource(failAfter?: number): WinnersSource {
    return async function* () {
      for (let page = 0; page * 500 < tickets.length; page++) {
        if (page === failAfter) throw new Error('network')
        yield { tickets: tickets.slice(page * 500, page * 500 + 500), total: tickets.length, totalPaid: 50_000 }
      }
    }
  }

  it('opens at once with an empty loading list and appends every page in order', async () => {
    const updates: WinningTicketsDraw[] = []
    await streamWinners(base, pagedSource(), new AbortController().signal, (updated) => updates.push(updated))
    expect(updates[0].tickets).toEqual([])
    expect(updates[0].ticketsComplete).toBe(false)
    expect(updates).toHaveLength(11)
    const last = updates.at(-1)!
    expect(last.tickets).toEqual(tickets)
    expect(last.ticketsComplete).toBe(true)
    expect(last.metrics.winningTickets).toBe(5_000)
    expect(last.metrics.totalPaid).toBe(50_000)
  })

  it('keeps what arrived when the source fails midway', async () => {
    const updates: WinningTicketsDraw[] = []
    await streamWinners(base, pagedSource(3), new AbortController().signal, (updated) => updates.push(updated))
    const last = updates.at(-1)!
    expect(last.tickets).toHaveLength(1_500)
    expect(last.ticketsComplete).toBe(true)
  })
})

describe('winners from GET /api/winners', () => {
  const draw: WinningTicketsDraw = {
    game: 'quickMoney',
    drawNumber: '0042',
    result: {},
    metrics: { totalWagered: null, totalPaid: null, participatingTickets: null, winningTickets: null },
    tickets: null,
  }
  const backendTickets = Array.from({ length: 450 }, (_, index) => ({
    ticketCode: `••••${String(index).padStart(4, '0')}`,
    idMachine: index % 3,
    terminal: `Caja ${index % 3}`,
    prizeAmount: 1_000 - index,
  }))

  function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status })
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('asks for every page in order until the total and maps the backend fields', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(url)
      const params = new URL(url, 'http://lobby').searchParams
      const offset = Number(params.get('offset'))
      const limit = Number(params.get('limit'))
      return json({ total: 450, totalPrize: 123.45, tickets: backendTickets.slice(offset, offset + limit) })
    }))

    const updates: WinningTicketsDraw[] = []
    await streamWinners(draw, winnersSourceFor(draw)!, new AbortController().signal, (updated) => updates.push(updated))

    expect(urls.map((url) => new URL(url, 'http://lobby').searchParams.get('offset'))).toEqual(['0', '200', '400'])
    expect(new URL(urls[0], 'http://lobby').searchParams.get('game')).toBe('lottery')
    const last = updates.at(-1)!
    expect(last.tickets).toHaveLength(450)
    expect(last.tickets![1]).toEqual({ code: '••••0001', machineId: 1, terminal: 'Caja 1', prize: 999 })
    expect(last.ticketsComplete).toBe(true)
    expect(last.metrics.totalPaid).toBe(123.45)
  })

  it('retries while the round is not settled yet (409)', async () => {
    vi.useFakeTimers()
    let calls = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls++
      return calls < 3 ? json({ error: 'not settled' }, 409) : json({ total: 0, totalPrize: 0, tickets: [] })
    }))

    const updates: WinningTicketsDraw[] = []
    const done = streamWinners(draw, winnersSourceFor(draw)!, new AbortController().signal, (updated) => updates.push(updated))
    await vi.advanceTimersByTimeAsync(3_000)
    await done

    expect(calls).toBe(3)
    const last = updates.at(-1)!
    expect(last.tickets).toEqual([])
    expect(last.ticketsComplete).toBe(true)
  })
})
