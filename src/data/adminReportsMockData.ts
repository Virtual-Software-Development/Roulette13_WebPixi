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

export const REPORT_GAME_ICON_URLS: Record<ReportGame, string> = {
  roulette: buildMediaUrl('Website_svg_icons/14_roulette_red.svg'),
  pick3: buildMediaUrl('Website_svg_icons/13_dice_blue.svg'),
  pick4: buildMediaUrl('Website_svg_icons/44_dice_purple.svg'),
}

export const REPORT_GAME_FILTER_OPTIONS: ReportGameFilter[] = ['all', 'roulette', 'pick3', 'pick4']
export const REPORT_TYPE_OPTIONS: ReportType[] = ['summary', 'gameReport', 'playerReport', 'financialReport', 'rtpAnalysis']
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

export const BETS_AND_PAYOUTS_Y_MAX = 200000
export const BETS_AND_PAYOUTS_Y_TICKS = [0, 50000, 100000, 150000, 200000]

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
