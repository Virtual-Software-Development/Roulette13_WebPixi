import { buildMediaUrl } from '../utils/media'
import type {
  BetsPayoutsPoint,
  GamePerformanceRow,
  ReportDateRangePreset,
  ReportGame,
  ReportGameFilter,
  ReportGroupBy,
  ReportKpiCardData,
  ReportRtpTrendPoint,
  ReportShortcutData,
  ReportType,
  RecentReportRow,
} from '../types/adminReports'

// Mock TEMPORAL para el Reports view del Admin -- no existe todavía un endpoint/store de reportes
// (mismo criterio que adminDashboardMockData.ts/rtpDashboardMockData.ts: reemplazar esto por el
// fetch/store real no requiere tocar ningún componente, todos reciben estos datos por props).

// Logos reales por juego (mismo criterio que RTP_GAME_ICON_URLS -- pedido explícito de reemplazar
// los pictogramas genéricos rueda/dado por el logo de marca de cada uno).
export const REPORT_GAME_ICON_URLS: Record<ReportGame, string> = {
  roulette: buildMediaUrl('Website_svg_icons/46_logo_option_2.svg'),
  pick3: buildMediaUrl('Website_svg_icons/49_pick-3-logo-option-2.svg'),
  pick4: buildMediaUrl('Website_svg_icons/51_pick-4-logo-option-2.svg'),
}

export const REPORT_GAME_FILTER_OPTIONS: ReportGameFilter[] = ['all', 'roulette', 'pick3', 'pick4']
export const REPORT_TYPE_OPTIONS: ReportType[] = ['summary', 'weeklyReport', 'monthlyReport', 'gameReport', 'playerReport', 'financialReport', 'rtpAnalysis']
export const REPORT_GROUP_BY_OPTIONS: ReportGroupBy[] = ['day', 'week', 'month']
export const REPORT_DATE_RANGE_OPTIONS: ReportDateRangePreset[] = ['last7Days', 'last30Days', 'thisMonth', 'lastMonth']

export const REPORT_KPI_CARDS: ReportKpiCardData[] = [
  {
    id: 'totalBets',
    titleKey: 'admin.reports.kpi.totalBets',
    value: '24,582',
    icon: 'bets',
    accent: 'green',
    trend: '+12%',
    trendTone: 'positive',
    trendLabelKey: 'admin.reports.kpi.vsPreviousPeriod',
  },
  {
    id: 'totalPayout',
    titleKey: 'admin.reports.kpi.totalPayout',
    value: '$1,216,480',
    icon: 'payout',
    accent: 'blue',
    trend: '+8%',
    trendTone: 'positive',
    trendLabelKey: 'admin.reports.kpi.vsPreviousPeriod',
  },
  {
    id: 'grossRevenue',
    titleKey: 'admin.reports.kpi.grossRevenue',
    value: '$304,520',
    icon: 'revenue',
    accent: 'purple',
    trend: '+28%',
    trendTone: 'positive',
    trendLabelKey: 'admin.reports.kpi.vsPreviousPeriod',
  },
  {
    id: 'rtp',
    titleKey: 'admin.reports.kpi.rtp',
    value: '95.06%',
    icon: 'rtp',
    accent: 'red',
    trend: '+0.76 pp',
    trendTone: 'accent',
    trendLabelKey: 'admin.reports.kpi.vsPreviousPeriod',
  },
]

export const BETS_AND_PAYOUTS_SERIES: BetsPayoutsPoint[] = [
  { label: 'Sep 1', bets: 125000, payout: 85000 },
  { label: 'Sep 2', bets: 150000, payout: 100000 },
  { label: 'Sep 3', bets: 162000, payout: 108000 },
  { label: 'Sep 4', bets: 172000, payout: 112000 },
]

export const REPORT_RTP_TREND_TARGET = 93
export const REPORT_RTP_TREND_SERIES: ReportRtpTrendPoint[] = [
  { label: 'Sep 1', rtp: 94.5, target: REPORT_RTP_TREND_TARGET },
  { label: 'Sep 2', rtp: 94.8, target: REPORT_RTP_TREND_TARGET },
  { label: 'Sep 3', rtp: 95.1, target: REPORT_RTP_TREND_TARGET },
  { label: 'Sep 4', rtp: 95.06, target: REPORT_RTP_TREND_TARGET },
]

export const GAME_PERFORMANCE_ROWS: GamePerformanceRow[] = [
  { id: 'roulette', labelKey: 'admin.dashboard.gamesActivity.roulette', totalBets: 12480, totalPayout: 686400, grossRevenue: 172080, rtp: 95.28 },
  { id: 'pick3', labelKey: 'admin.dashboard.gamesActivity.pick3', totalBets: 7842, totalPayout: 392100, grossRevenue: 98250, rtp: 95.45 },
  { id: 'pick4', labelKey: 'admin.dashboard.gamesActivity.pick4', totalBets: 4260, totalPayout: 137980, grossRevenue: 68020, rtp: 92.11 },
]

export const GAME_PERFORMANCE_TOTAL = {
  totalBets: 24582,
  totalPayout: 1216480,
  grossRevenue: 304520,
  rtp: 95.06,
}

export const REPORT_SHORTCUTS: ReportShortcutData[] = [
  {
    id: 'gameReport',
    icon: buildMediaUrl('Website_svg_icons/09_analytics_white.svg'),
    titleKey: 'admin.reports.shortcuts.gamePerformance.title',
    descriptionKey: 'admin.reports.shortcuts.gamePerformance.description',
  },
  {
    id: 'playerReport',
    icon: buildMediaUrl('Website_svg_icons/24_users_gray.svg'),
    titleKey: 'admin.reports.shortcuts.playerActivity.title',
    descriptionKey: 'admin.reports.shortcuts.playerActivity.description',
  },
  {
    id: 'financialReport',
    icon: buildMediaUrl('Website_svg_icons/11_document_white.svg'),
    titleKey: 'admin.reports.shortcuts.financialReport.title',
    descriptionKey: 'admin.reports.shortcuts.financialReport.description',
  },
  {
    id: 'rtpAnalysis',
    icon: buildMediaUrl('Website_svg_icons/05_target_white.svg'),
    titleKey: 'admin.reports.shortcuts.rtpAnalysis.title',
    descriptionKey: 'admin.reports.shortcuts.rtpAnalysis.description',
  },
  // Weekly = últimos 7 días agrupado por día; Monthly = mes calendario anterior agrupado por semana.
  {
    id: 'weeklyReport',
    icon: buildMediaUrl('Website_svg_icons/30_clock_white.svg'),
    titleKey: 'admin.reports.shortcuts.weeklyReport.title',
    descriptionKey: 'admin.reports.shortcuts.weeklyReport.description',
    dateRange: 'last7Days',
    groupBy: 'day',
  },
  {
    id: 'monthlyReport',
    icon: buildMediaUrl('Website_svg_icons/33_calendar_white.svg'),
    titleKey: 'admin.reports.shortcuts.monthlyReport.title',
    descriptionKey: 'admin.reports.shortcuts.monthlyReport.description',
    dateRange: 'lastMonth',
    groupBy: 'week',
  },
]

export const RECENT_REPORTS: RecentReportRow[] = [
  {
    id: 'r1',
    name: 'Weekly Summary',
    type: 'summary',
    dateRangeLabel: 'Aug 28, 2026 - Sep 3, 2026',
    generatedBy: 'Admin',
    createdAt: 'Sep 4, 2026 10:15',
  },
  {
    id: 'r2',
    name: 'Roulette Performance',
    type: 'gameReport',
    dateRangeLabel: 'Sep 1, 2026 - Sep 4, 2026',
    generatedBy: 'Admin',
    createdAt: 'Sep 4, 2026 09:42',
  },
  {
    id: 'r3',
    name: 'Player Activity Report',
    type: 'playerReport',
    dateRangeLabel: 'Sep 1, 2026 - Sep 4, 2026',
    generatedBy: 'Admin',
    createdAt: 'Sep 4, 2026 08:30',
  },
]

// Peak Hours (ver PeakHoursHeatmap.tsx) -- total apostado por día de semana (0 = Lunes) × hora, para
// todos los juegos. Curva diaria realista (madrugada baja, almuerzo, pico 20-23h), fines de semana y
// viernes más altos, más una variación pseudoaleatoria con semilla fija (estable entre renders).
function peakHoursRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

const HOURLY_SHAPE = [
  0.22, 0.16, 0.11, 0.08, 0.07, 0.08, 0.12, 0.2, 0.3, 0.38, 0.44, 0.5,
  0.62, 0.6, 0.52, 0.5, 0.56, 0.66, 0.78, 0.9, 1.0, 0.98, 0.84, 0.5,
]
const DAY_FACTOR = [0.82, 0.8, 0.85, 0.9, 1.12, 1.3, 1.18]
const PEAK_HOURS_BASE_BET = 4200

export const PEAK_HOURS_BETS: number[][] = (() => {
  const random = peakHoursRandom(2026)
  return DAY_FACTOR.map((dayFactor) =>
    HOURLY_SHAPE.map((shape) => Math.round(PEAK_HOURS_BASE_BET * shape * dayFactor * (0.88 + random() * 0.24))),
  )
})()

// Apuesta promedio por ronda -- solo para estimar "rondas" en el detalle de cada franja.
export const PEAK_HOURS_AVERAGE_BET = 12

// Participación de cada juego en el total -- el heatmap escala por esto al filtrar por juego.
export const PEAK_HOURS_GAME_SHARE: Record<ReportGameFilter, number> = { all: 1, roulette: 0.56, pick3: 0.26, pick4: 0.18 }
