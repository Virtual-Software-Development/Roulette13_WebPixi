import { formatDate } from './reportFormat'

// Períodos de Reports. Un período son días calendario completos [start, end] (ambos a las 00:00,
// end inclusivo) en hora de Santo Domingo (ver reportFormat.ts). `partial` = incluye el día de
// hoy, que todavía no terminó.
//
// - Resumen y el resto de reportes: rango libre (presets + personalizado), por defecto hoy.
// - Semanal: semana calendario lunes–domingo; por defecto la última cerrada.
// - Mensual: mes calendario; por defecto el último cerrado.

export type ReportRangePreset = 'today' | 'yesterday' | 'last7Days' | 'last30Days' | 'thisMonth' | 'lastMonth' | 'custom'
export type ReportPeriodKind = 'range' | 'week' | 'month'

export interface ReportPeriod {
  start: Date
  end: Date
  partial: boolean
}

export const REPORT_RANGE_PRESETS: ReportRangePreset[] = ['today', 'yesterday', 'last7Days', 'last30Days', 'thisMonth', 'lastMonth', 'custom']

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

function makePeriod(start: Date, end: Date, now: Date): ReportPeriod {
  const today = startOfDay(now)
  const clampedEnd = end > today ? today : startOfDay(end)
  return { start: startOfDay(start), end: clampedEnd, partial: isSameDay(clampedEnd, today) }
}

export function presetPeriod(preset: Exclude<ReportRangePreset, 'custom'>, now: Date): ReportPeriod {
  const today = startOfDay(now)
  switch (preset) {
    case 'today':
      return makePeriod(today, today, now)
    case 'yesterday':
      return makePeriod(addDays(today, -1), addDays(today, -1), now)
    case 'last7Days':
      return makePeriod(addDays(today, -6), today, now)
    case 'last30Days':
      return makePeriod(addDays(today, -29), today, now)
    case 'thisMonth':
      return makePeriod(new Date(today.getFullYear(), today.getMonth(), 1), today, now)
    case 'lastMonth':
      return makePeriod(new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0), now)
  }
}

// Rango personalizado: se ordena si viene invertido y no pasa de hoy.
export function customPeriod(from: Date, to: Date, now: Date): ReportPeriod {
  return from <= to ? makePeriod(from, to, now) : makePeriod(to, from, now)
}

const mondayOf = (date: Date) => addDays(startOfDay(date), -((date.getDay() + 6) % 7))

// Índice 0 = semana en curso (parcial); 1 = última semana cerrada (el default del Semanal).
export function weekPeriods(now: Date, count = 12): ReportPeriod[] {
  const currentMonday = mondayOf(now)
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(currentMonday, -7 * i)
    return makePeriod(start, addDays(start, 6), now)
  })
}

// Índice 0 = mes en curso (parcial); 1 = último mes cerrado (el default del Mensual).
export function monthPeriods(now: Date, count = 12): ReportPeriod[] {
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return makePeriod(start, new Date(start.getFullYear(), start.getMonth() + 1, 0), now)
  })
}

export function periodDays(period: ReportPeriod): Date[] {
  const days: Date[] = []
  for (let d = period.start; d <= period.end; d = addDays(d, 1)) days.push(d)
  return days
}

export const periodLength = (period: ReportPeriod) => periodDays(period).length

// Período de comparación:
// - semana: la anterior; si la actual es parcial, solo los mismos días (lun–mié contra lun–mié).
// - mes: el anterior; si el actual es parcial, los mismos días (1–12 oct contra 1–12 sep).
// - rango libre: el inmediatamente anterior de igual duración.
export function comparisonPeriod(period: ReportPeriod, kind: ReportPeriodKind): ReportPeriod {
  const length = periodLength(period)
  if (kind === 'week') {
    return { start: addDays(period.start, -7), end: addDays(period.start, length - 8), partial: false }
  }
  if (kind === 'month') {
    const start = new Date(period.start.getFullYear(), period.start.getMonth() - 1, 1)
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    const end = period.partial ? new Date(start.getFullYear(), start.getMonth(), Math.min(length, monthEnd.getDate())) : monthEnd
    return { start, end, partial: false }
  }
  return { start: addDays(period.start, -length), end: addDays(period.start, -1), partial: false }
}

// Fracción del día ya transcurrida (1 para días cerrados) -- el día de hoy solo cuenta hasta ahora.
export function dayElapsedFraction(day: Date, now: Date): number {
  return isSameDay(day, now) ? (now.getHours() * 60 + now.getMinutes()) / 1440 : 1
}

export function formatPeriodRange(period: ReportPeriod): string {
  return isSameDay(period.start, period.end) ? formatDate(period.start) : `${formatDate(period.start)} – ${formatDate(period.end)}`
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function fromIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null
}
