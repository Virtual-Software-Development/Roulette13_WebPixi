export type RtpGame = 'roulette' | 'quickMoney'

export type RtpKpiAccent = 'red' | 'blue' | 'purple' | 'green' | 'amber'

// Indicadores del RTP Dashboard (metric cards, Recent RTP Changes) y de los estados de RTP Profile
// (ver RtpProfilesTable.tsx).
export type StatusBadgeVariant = 'positive' | 'info' | 'warning' | 'neutral' | 'danger' | 'purple'

export type RtpStatusIcon = 'check' | 'up' | 'down' | 'dot'

// Estado del RTP medido respecto de la banda (internal/rtpstats); noData = sin apuestas en la ventana.
export type RtpBandStatus = 'within' | 'above' | 'below' | 'noData'

// Tarjeta de un juego: RTP medido sobre la ventana de corrección del motor (solo rondas COMPLETED).
export interface RtpGameOverview {
  game: RtpGame
  targetRtp: number
  minBand: number
  maxBand: number
  correctionWindow: number
  correctionWindowUnlimited: boolean
  windowRounds: number
  // null sin apuestas en la ventana.
  currentRtp: number | null
  status: RtpBandStatus
}

// GGR de los últimos 7 días contra los 7 anteriores; changePct null si el anterior dio 0.
export interface HouseMarginData {
  ggr: number
  changePct: number | null
}

export interface RtpChange {
  id: number
  game: RtpGame
  previousTarget: number
  newTarget: number
  // null = el sistema.
  changedBy: string | null
  createdAt: string
  automatic: boolean
}

export interface RtpOverview {
  games: RtpGameOverview[]
  houseMargin: HouseMarginData
  // Resultados cambiados a mano en rondas COMPLETED de los últimos 7 días.
  manualResults: number
  changes: RtpChange[]
  changesTotal: number
}

// Un día del gráfico Actual vs Target: actual null si ese día no hubo apuestas en rondas COMPLETED.
export interface RtpHistoryPoint {
  date: string
  rouletteActual: number | null
  rouletteTarget: number
  quickMoneyActual: number | null
  quickMoneyTarget: number
}

// Rango del selector de Actual vs Target RTP (ver RtpTrendChart.tsx).
export type RtpTrendRange = 'last7Days' | 'twoWeeks' | 'threeWeeks' | 'oneMonth'

export const RTP_TREND_RANGE_DAYS: Record<RtpTrendRange, number> = {
  last7Days: 7,
  twoWeeks: 14,
  threeWeeks: 21,
  oneMonth: 30,
}

export interface RtpBand {
  id: RtpGame
  min: number
  max: number
}

// RTP Stability (ver RtpStabilityChart.tsx) -- RTP acumulado a lo largo de la ventana de corrección
// (rondas con apuestas, en orden de sorteo), contra el rango esperado por azar. sigma = desvío del
// retorno por ronda (fracción): el error esperado tras n rondas es sigma/√n. null con < 2 rondas.
export interface RtpStabilityPoint {
  rounds: number
  rtp: number
}

export interface RtpStabilityData {
  target: number
  sigma: number | null
  points: RtpStabilityPoint[]
}
