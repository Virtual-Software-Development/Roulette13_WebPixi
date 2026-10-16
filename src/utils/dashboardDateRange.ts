export const DASHBOARD_DATE_RANGES = ['today', 'yesterday', 'last7Days', 'last30Days', 'thisMonth'] as const

export type DashboardDateRange = (typeof DASHBOARD_DATE_RANGES)[number]

function startOfDay(date: Date, plusDays = 0): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + plusDays)
}

// [from, to) del rango en la hora local del navegador; "to" es la medianoche siguiente (el día de
// hoy entero), salvo "yesterday". El backend compara con el período anterior de igual duración.
export function dashboardDateRangeBounds(range: DashboardDateRange, now: Date): { from: Date; to: Date } {
  const tomorrow = startOfDay(now, 1)
  switch (range) {
    case 'today':
      return { from: startOfDay(now), to: tomorrow }
    case 'yesterday':
      return { from: startOfDay(now, -1), to: startOfDay(now) }
    case 'last7Days':
      return { from: startOfDay(now, -6), to: tomorrow }
    case 'last30Days':
      return { from: startOfDay(now, -29), to: tomorrow }
    case 'thisMonth':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: tomorrow }
  }
}
