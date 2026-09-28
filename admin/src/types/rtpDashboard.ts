export type RtpGame = 'roulette' | 'pick3' | 'pick4'

export type RtpKpiAccent = 'red' | 'blue' | 'purple' | 'green' | 'amber'

// warning/neutral/danger/purple agregados para los estados de RTP Profile (Expiring Soon/Expired/
// Disabled/Replaced, ver RtpProfilesTable.tsx) -- positive/info siguen siendo los únicos usados
// por el RTP Dashboard (metric cards, Recent RTP Changes), sin cambios ahí.
export type StatusBadgeVariant = 'positive' | 'info' | 'warning' | 'neutral' | 'danger' | 'purple'

export type RtpStatusIcon = 'check' | 'up' | 'dot'

export interface RtpMetricCardData {
  id: RtpGame
  titleKey: string
  icon: string
  accent: RtpKpiAccent
  current: number
  target: number
  statusLabelKey: string
  statusVariant: StatusBadgeVariant
  statusIcon: RtpStatusIcon
}

export interface HouseMarginData {
  icon: string
  value: string
  trend: string
  trendDirection: 'up' | 'down'
  trendLabelKey: string
}

export interface ManualOverridesData {
  icon: string
  value: number
}

export interface RtpHistoryPoint {
  date: string
  rouletteActual: number
  rouletteTarget: number
  pick3Actual: number
  pick3Target: number
  pick4Actual: number
  pick4Target: number
}

// Rango del selector de Actual vs Target RTP (ver RtpTrendChart.tsx) -- cada uno resuelve a una
// cantidad de días distinta (ver RTP_HISTORY_BY_RANGE en data/rtpDashboardMockData.ts).
export type RtpTrendRange = 'last7Days' | 'twoWeeks' | 'threeWeeks' | 'oneMonth'

export interface RtpBand {
  id: RtpGame
  labelKey: string
  min: number
  max: number
  widthPercent: number
}

export type RtpChangeStatus = 'autoApplied' | 'applied'

export interface RtpChange {
  id: string
  game: RtpGame
  previousTarget: number
  newTarget: number
  changedBy: string
  dateTime: string
  status: RtpChangeStatus
}
