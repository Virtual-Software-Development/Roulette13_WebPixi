export type ReportMetricAccent = 'green' | 'blue' | 'purple' | 'red'
export type ReportMetricIcon = 'bets' | 'payout' | 'revenue' | 'rtp'

export interface ReportKpiCardData {
  id: string
  titleKey: string
  value: string
  icon: ReportMetricIcon
  accent: ReportMetricAccent
  trend: string
  // 'positive' pinta el trend en verde (Total Bets/Payout/Revenue); 'accent' lo pinta con el mismo
  // color que la card (RTP, cuya variación en pp la referencia distingue en rojo aunque sea positiva).
  trendTone: 'positive' | 'accent'
  trendLabelKey: string
}

export interface BetsPayoutsPoint {
  label: string
  bets: number
  payout: number
}

export interface ReportRtpTrendPoint {
  label: string
  rtp: number
  target: number
}

export type ReportGame = 'roulette' | 'pick3' | 'pick4'

export interface GamePerformanceRow {
  id: ReportGame
  labelKey: string
  totalBets: number
  totalPayout: number
  grossRevenue: number
  rtp: number
}

export type ReportType = 'summary' | 'gameReport' | 'playerReport' | 'financialReport' | 'rtpAnalysis'

export interface ReportShortcutData {
  id: ReportType
  icon: string
  titleKey: string
  descriptionKey: string
}

export type ReportGameFilter = 'all' | ReportGame
export type ReportGroupBy = 'day' | 'week' | 'month'
export type ReportDateRangePreset = 'last7Days' | 'last30Days' | 'thisMonth' | 'lastMonth'

export type RecentReportFormat = 'csv' | 'pdf' | 'excel'

export interface RecentReportRow {
  id: string
  name: string
  type: ReportType
  dateRangeLabel: string
  generatedBy: string
  createdAt: string
}
