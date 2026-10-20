import { describe, expect, it } from 'vitest'
import { nextSegment, renderRange, rowAt } from '../utils/winningTicketsScroll'
import { generateMockWinners, mockWinnersSource, streamWinners } from '../api/drawWinners'
import type { WinningTicketsDraw } from '../types/winningTickets'

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

describe('mock winners (outside bet winning across the fleet)', () => {
  const draw: Pick<WinningTicketsDraw, 'game' | 'drawNumber'> = { game: 'roulette', drawNumber: '0092' }

  it('generates the requested amount, unique codes, sorted by prize, same list on every machine', () => {
    const tickets = generateMockWinners(draw, 5_000)
    expect(tickets).toHaveLength(5_000)
    expect(new Set(tickets.map((ticket) => ticket.code)).size).toBe(5_000)
    for (let index = 1; index < tickets.length; index++) expect(tickets[index - 1].prize).toBeGreaterThanOrEqual(tickets[index].prize)
    expect(generateMockWinners(draw, 5_000)).toEqual(tickets)
  })

  it('streams every ticket by pages, opening at once with an empty loading list', async () => {
    const base: WinningTicketsDraw = {
      ...draw,
      result: { roulette: '7' },
      metrics: { totalWagered: null, totalPaid: null, participatingTickets: null, winningTickets: null },
      tickets: null,
    }
    const source = mockWinnersSource(base, { total: 5_000, pageSize: 500, firstPageDelayMs: 0, pageDelayMs: 0 })
    const updates: WinningTicketsDraw[] = []
    await streamWinners(base, source, new AbortController().signal, (updated) => updates.push(updated))
    expect(updates[0].tickets).toEqual([])
    expect(updates[0].ticketsComplete).toBe(false)
    expect(updates).toHaveLength(11)
    const last = updates.at(-1)!
    expect(last.tickets).toHaveLength(5_000)
    expect(last.ticketsComplete).toBe(true)
    expect(last.metrics.winningTickets).toBe(5_000)
  })
})
