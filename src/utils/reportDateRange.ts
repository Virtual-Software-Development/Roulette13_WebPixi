import type { ReportDateRangePreset } from '../types/adminReports'

const RANGE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Los presets ya no apuntan a fechas fijas mockeadas (ver conversación: "debe tomar las fechas
// actuales") -- se calculan siempre contra `today` (por default la fecha real, parametrizable
// solo para tests).
export function getReportDateRangeBounds(preset: ReportDateRangePreset, today: Date = new Date()): { start: Date; end: Date } {
  switch (preset) {
    case 'last7Days':
      return { start: addDays(today, -6), end: today }
    case 'last30Days':
      return { start: addDays(today, -29), end: today }
    case 'thisMonth':
      return { start: startOfMonth(today), end: today }
    case 'lastMonth': {
      const lastMonthEnd = addDays(startOfMonth(today), -1)
      return { start: startOfMonth(lastMonthEnd), end: lastMonthEnd }
    }
  }
}

export function getReportDateRangeLabel(preset: ReportDateRangePreset, today: Date = new Date()): string {
  const { start, end } = getReportDateRangeBounds(preset, today)
  return `${RANGE_FORMATTER.format(start)} - ${RANGE_FORMATTER.format(end)}`
}
