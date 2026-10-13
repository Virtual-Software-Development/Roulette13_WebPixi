import { describe, expect, it } from 'vitest'
import { buildManualSubstitutionsReport } from '../data/manualSubstitutionsMockData'
import { presetPeriod } from '../utils/reportPeriod'

const TODAY = new Date(2026, 9, 12, 15, 30)

describe('buildManualSubstitutionsReport', () => {
  it('has one row per day of the selected period', () => {
    expect(buildManualSubstitutionsReport(presetPeriod('last7Days', TODAY), TODAY).days).toHaveLength(7)
    expect(buildManualSubstitutionsReport(presetPeriod('thisMonth', TODAY), TODAY).days).toHaveLength(12)
    expect(buildManualSubstitutionsReport(presetPeriod('lastMonth', TODAY), TODAY).days).toHaveLength(30)
  })

  it('counts one round per minute, today only up to now', () => {
    const { days } = buildManualSubstitutionsReport(presetPeriod('last7Days', TODAY), TODAY)
    expect(days[0].events).toBe(1440)
    expect(days[days.length - 1].events).toBe(15 * 60 + 30)
  })

  it('keeps totals, days and operators consistent', () => {
    const { days, operators, totals } = buildManualSubstitutionsReport(presetPeriod('last30Days', TODAY), TODAY)
    const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

    expect(sum(days.map((d) => d.events))).toBe(totals.events)
    expect(sum(days.map((d) => d.annulments))).toBe(totals.annulments)
    expect(sum(operators.map((o) => o.annulments))).toBe(totals.annulments)
    expect(sum(operators.map((o) => o.shareOfAnnulments))).toBeCloseTo(100, 9)
    expect(sum(operators.map((o) => o.rtpImpactPp))).toBeCloseTo(totals.rtpImpactPp, 9)
    expect(days[days.length - 1].cumulativeRtpImpactPp).toBeCloseTo(totals.rtpImpactPp, 9)
    expect(totals.annulmentRate).toBeCloseTo((totals.annulments / totals.events) * 100, 9)
  })

  it('never reports a substitution later than now', () => {
    const { operators } = buildManualSubstitutionsReport(presetPeriod('thisMonth', TODAY), TODAY)
    operators.forEach((o) => expect(o.lastSubstitutionAt!.getTime()).toBeLessThanOrEqual(TODAY.getTime()))
  })

  it('is deterministic for the same date range', () => {
    expect(buildManualSubstitutionsReport(presetPeriod('last7Days', TODAY), TODAY)).toEqual(buildManualSubstitutionsReport(presetPeriod('last7Days', TODAY), TODAY))
  })
})
