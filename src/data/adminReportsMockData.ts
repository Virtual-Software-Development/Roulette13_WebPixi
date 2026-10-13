import { buildMediaUrl } from '../utils/media'
import type { ReportGame, ReportGameFilter, ReportKpiCardData, ReportShortcutData, ReportType, RecentReportRow } from '../types/adminReports'

export const REPORT_GAME_ICON_URLS: Record<ReportGame, string> = {
  roulette: buildMediaUrl('Website_svg_icons/46_logo_option_2.svg'),
  pick3: buildMediaUrl('Website_svg_icons/49_pick-3-logo-option-2.svg'),
  pick4: buildMediaUrl('Website_svg_icons/51_pick-4-logo-option-2.svg'),
}

// Mock TEMPORAL para el Reports view del Admin -- no existe todavía un endpoint/store de reportes
// (mismo criterio que adminDashboardMockData.ts/rtpDashboardMockData.ts: reemplazar esto por el
// fetch/store real no requiere tocar ningún componente, todos reciben estos datos por props).

export const REPORT_GAME_FILTER_OPTIONS: ReportGameFilter[] = ['all', 'roulette', 'pick3', 'pick4']
export const REPORT_TYPE_OPTIONS: ReportType[] = [
  'summary',
  'weeklyReport',
  'monthlyReport',
  'gameReport',
  'salesActivity',
  'financialReport',
  'rtpAnalysis',
  'manualSubstitutions',
]

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

export const REPORT_SHORTCUTS: ReportShortcutData[] = [
  {
    id: 'gameReport',
    icon: buildMediaUrl('Website_svg_icons/09_analytics_white.svg'),
    titleKey: 'admin.reports.shortcuts.gamePerformance.title',
    descriptionKey: 'admin.reports.shortcuts.gamePerformance.description',
  },
  {
    id: 'salesActivity',
    icon: buildMediaUrl('Website_svg_icons/24_users_gray.svg'),
    titleKey: 'admin.reports.shortcuts.salesActivity.title',
    descriptionKey: 'admin.reports.shortcuts.salesActivity.description',
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
  // Semanal/Mensual abren en la última semana/mes cerrado (ver AdminReportsPage.handleShortcutSelect).
  {
    id: 'weeklyReport',
    icon: buildMediaUrl('Website_svg_icons/30_clock_white.svg'),
    titleKey: 'admin.reports.shortcuts.weeklyReport.title',
    descriptionKey: 'admin.reports.shortcuts.weeklyReport.description',
  },
  {
    id: 'monthlyReport',
    icon: buildMediaUrl('Website_svg_icons/33_calendar_white.svg'),
    titleKey: 'admin.reports.shortcuts.monthlyReport.title',
    descriptionKey: 'admin.reports.shortcuts.monthlyReport.description',
  },
  // Historial de sustituciones manuales de resultado (solo ruleta) -- respeta el período actual.
  {
    id: 'manualSubstitutions',
    icon: buildMediaUrl('Website_svg_icons/15_pencil_white.svg'),
    titleKey: 'admin.reports.shortcuts.manualSubstitutions.title',
    descriptionKey: 'admin.reports.shortcuts.manualSubstitutions.description',
  },
]

export const RECENT_REPORTS: RecentReportRow[] = [
  {
    id: 'r1',
    name: 'Weekly Report',
    type: 'weeklyReport',
    dateRangeLabel: '28/09/2026 – 04/10/2026',
    generatedBy: 'Admin',
    createdAt: '05/10/2026 10:15',
    period: { start: '2026-09-28', end: '2026-10-04' },
    game: 'all',
  },
  {
    id: 'r2',
    name: 'Roulette Game Report',
    type: 'gameReport',
    dateRangeLabel: '01/10/2026 – 04/10/2026',
    generatedBy: 'Admin',
    createdAt: '05/10/2026 09:42',
    period: { start: '2026-10-01', end: '2026-10-04' },
    game: 'roulette',
  },
  {
    id: 'r3',
    name: 'Sales Point Activity',
    type: 'salesActivity',
    dateRangeLabel: '01/10/2026 – 04/10/2026',
    generatedBy: 'Admin',
    createdAt: '05/10/2026 08:30',
    period: { start: '2026-10-01', end: '2026-10-04' },
    game: 'all',
  },
]
