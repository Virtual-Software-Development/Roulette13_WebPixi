import { describe, expect, it } from 'vitest'
import { machineActivity, totalsByDay, totalsByGame, totalsFor } from '../data/reportsMockData'
import { formatCompactCurrency, formatCurrency, formatVariation, setReportCurrency } from '../utils/reportFormat'
import { comparisonPeriod, monthPeriods, periodDays, presetPeriod, toIsoDate, weekPeriods } from '../utils/reportPeriod'

// Lunes 12/10/2026 15:30 (hora de Santo Domingo).
const NOW = new Date(2026, 9, 12, 15, 30)

const iso = (p: { start: Date; end: Date }) => [toIsoDate(p.start), toIsoDate(p.end)]

describe('report periods', () => {
  it('weeks run Monday to Sunday; index 0 is the current (partial) week', () => {
    const [current, lastClosed] = weekPeriods(NOW)
    expect(iso(current)).toEqual(['2026-10-12', '2026-10-12'])
    expect(current.partial).toBe(true)
    expect(iso(lastClosed)).toEqual(['2026-10-05', '2026-10-11'])
    expect(lastClosed.partial).toBe(false)
  })

  it('a partial week compares against the same weekdays of the previous week', () => {
    const wednesday = new Date(2026, 9, 14, 9, 0)
    const [current] = weekPeriods(wednesday)
    expect(iso(comparisonPeriod(current, 'week'))).toEqual(['2026-10-05', '2026-10-07'])
  })

  it('a partial month compares against the same days of the previous month', () => {
    const [current, lastClosed] = monthPeriods(NOW)
    expect(iso(comparisonPeriod(current, 'month'))).toEqual(['2026-09-01', '2026-09-12'])
    expect(iso(comparisonPeriod(lastClosed, 'month'))).toEqual(['2026-08-01', '2026-08-31'])
  })

  it('a free range compares against the immediately previous range of the same length', () => {
    expect(iso(comparisonPeriod(presetPeriod('last7Days', NOW), 'range'))).toEqual(['2026-09-29', '2026-10-05'])
  })
})

describe('report formats', () => {
  it('formats RD$ with two decimals and variation as "—" when the previous value is 0', () => {
    expect(formatCurrency(1234.5)).toBe('RD$ 1,234.50')
    expect(formatCurrency(-10)).toBe('-RD$ 10.00')
    expect(formatVariation(110, 100)).toBe('+10.0%')
    expect(formatVariation(5, 0)).toBe('—')
  })

  it('takes the symbol and decimals from the ISO currency code (default DOP)', () => {
    try {
      setReportCurrency('USD')
      expect(formatCurrency(1234.5)).toBe('US$ 1,234.50')
      setReportCurrency('EUR')
      expect(formatCompactCurrency(350_000)).toBe('€ 350K')
      setReportCurrency('JPY')
      expect(formatCurrency(1234.5)).toBe('¥ 1,235')
    } finally {
      setReportCurrency('DOP')
    }
    expect(formatCurrency(1234.5)).toBe('RD$ 1,234.50')
  })
})

describe('reports mock data', () => {
  const period = presetPeriod('last7Days', NOW)

  it('adds up the same totals by day, by game and by machine', () => {
    const total = totalsFor(period, 'all', NOW)
    const byDay = totalsByDay(period, 'all', NOW).reduce((s, d) => s + d.totals.sales, 0)
    const byGame = totalsByGame(period, NOW).reduce((s, g) => s + g.totals.sales, 0)
    const byMachine = machineActivity(period, 'all', NOW).reduce((s, m) => s + m.totals.sales, 0)
    expect(byDay).toBeCloseTo(total.sales, 6)
    expect(byGame).toBeCloseTo(total.sales, 6)
    expect(byMachine).toBeCloseTo(total.sales, 6)
    expect(machineActivity(period, 'all', NOW).reduce((s, m) => s + m.totals.tickets, 0)).toBe(total.tickets)
  })

  it('only counts today up to now', () => {
    const today = totalsByDay(presetPeriod('today', NOW), 'roulette', NOW)
    expect(periodDays(presetPeriod('today', NOW))).toHaveLength(1)
    expect(today[0].totals.rounds).toBe(15 * 60 + 30)
  })
})
