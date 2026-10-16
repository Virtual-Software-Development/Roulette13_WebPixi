import { describe, expect, it } from 'vitest'
import { buildManualSubstitutionsReport } from '../components/admin/reports/document/reportData'
import type { ReportGameFilter } from '../types/adminReports'
import { comparisonPeriod, presetPeriod, type ReportPeriod } from '../utils/reportPeriod'
import { fixtureActivity, fixtureSubstitutions } from './reportFixtures'

const TODAY = new Date(2026, 9, 12, 15, 30)

function report(period: ReportPeriod, filter: ReportGameFilter = 'roulette') {
  const previousPeriod = comparisonPeriod(period, 'range')
  return buildManualSubstitutionsReport({
    period,
    previousPeriod,
    filter,
    activity: fixtureActivity(period),
    substitutions: fixtureSubstitutions(period),
    previousActivity: fixtureActivity(previousPeriod),
    previousSubstitutions: fixtureSubstitutions(previousPeriod),
  })
}

describe('buildManualSubstitutionsReport', () => {
  it('has one row per day of the selected period', () => {
    expect(report(presetPeriod('last7Days', TODAY)).days).toHaveLength(7)
    expect(report(presetPeriod('thisMonth', TODAY)).days).toHaveLength(12)
    expect(report(presetPeriod('lastMonth', TODAY)).days).toHaveLength(30)
  })

  it('counts the drawn rounds of the chosen games as events', () => {
    const { days } = report(presetPeriod('last7Days', TODAY))
    expect(days.map((d) => d.events)).toEqual([10, 11, 12, 13, 14, 15, 16])
    expect(report(presetPeriod('last7Days', TODAY), 'all').days[0].events).toBe(10 + 4)
  })

  it('measures the RTP impact as the change in what the bets paid over what was wagered', () => {
    const { days, operators, totals } = report(presetPeriod('last7Days', TODAY))
    // Día 0 de ruleta: 5 tickets × 100 apostados; la sustitución bajó lo pagado 225.
    expect(days[0].rtpImpactPp).toBeCloseTo((-225 / 500) * 100, 9)
    expect(operators).toHaveLength(1)
    expect(operators[0]).toMatchObject({ fullName: 'John Doe', username: 'jdoe', annulments: 7, shareOfAnnulments: 100 })

    const all = report(presetPeriod('last7Days', TODAY), 'all')
    expect(all.operators.map((o) => o.id)).toEqual(['jdoe', 'no-session'])
    expect(all.operators[1].rtpImpactPp).toBeGreaterThan(0)
    expect(totals.rtpImpactPp).toBeLessThan(0)
  })

  it('keeps totals, days and operators consistent', () => {
    const { days, operators, totals } = report(presetPeriod('last30Days', TODAY), 'all')
    const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

    expect(sum(days.map((d) => d.events))).toBe(totals.events)
    expect(sum(days.map((d) => d.annulments))).toBe(totals.annulments)
    expect(sum(operators.map((o) => o.annulments))).toBe(totals.annulments)
    expect(sum(operators.map((o) => o.shareOfAnnulments))).toBeCloseTo(100, 9)
    expect(sum(operators.map((o) => o.rtpImpactPp))).toBeCloseTo(totals.rtpImpactPp, 9)
    expect(days[days.length - 1].cumulativeRtpImpactPp).toBeCloseTo(totals.rtpImpactPp, 9)
    expect(totals.annulmentRate).toBeCloseTo((totals.annulments / totals.events) * 100, 9)
  })

  it('reports nothing for a period without substitutions', () => {
    const period = presetPeriod('last7Days', TODAY)
    const empty = buildManualSubstitutionsReport({
      period,
      previousPeriod: comparisonPeriod(period, 'range'),
      filter: 'roulette',
      activity: { days: [], hours: [] },
      substitutions: [],
      previousActivity: { days: [], hours: [] },
      previousSubstitutions: [],
    })
    expect(empty.totals).toEqual({ events: 0, annulments: 0, annulmentRate: 0, rtpImpactPp: 0 })
    expect(empty.operators).toEqual([])
  })
})
