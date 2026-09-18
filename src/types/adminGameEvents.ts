import type { RtpGame } from './rtpDashboard'

// Reutiliza RtpGame ('roulette'|'pick3'|'pick4') -- mismo set de juegos que RTP Management/Next
// Results, no existe un juego distinto para Game Events (ver GAME_LABEL_KEY/RTP_GAME_ICON_URLS).
export type GameEventGame = RtpGame

export type GameEventStatus = 'completed' | 'live' | 'scheduled'

export type GameEventTimelineStepId = 'created' | 'started' | 'drawCompleted' | 'resultsPublished'

export interface GameEventTimelineStep {
  id: GameEventTimelineStepId
  // null = etapa todavía no alcanzada (ver GameEventStatusTimeline.tsx) -- nunca se inventa un
  // timestamp para una etapa futura.
  timestamp: string | null
}

export interface GameEventStatistics {
  totalBets: number
  totalPayout: number
  uniquePlayers: number
}

export type GameEventPayoutStatus = 'paid' | 'pending'

export interface GameEventPayoutRow {
  id: string
  player: string
  betAmount: number
  payoutAmount: number
  status: GameEventPayoutStatus
}

export interface GameEventLogEntry {
  id: string
  timestamp: string
  // Texto ya formateado, no un i18n key -- mismo criterio que RtpProfile.scheduleSummary/
  // RtpProfileActivity.changedBy (son datos, no copy de UI).
  message: string
}

export interface GameEvent {
  id: string
  name: string
  game: GameEventGame
  status: GameEventStatus
  description?: string
  date: string
  startTime: string
  endTime: string | null
  durationMinutes: number | null
  // null mientras el evento no tiene resultado (scheduled/live) -- el tamaño del array depende
  // del juego (1 para Roulette, 3 para Pick 3, 4 para Pick 4), nunca se asume una cantidad fija.
  result: number[] | null
  resultDrawnAt: string | null
  timeline: GameEventTimelineStep[]
  // null mientras el evento no tiene estadísticas todavía (scheduled/live).
  statistics: GameEventStatistics | null
  payouts: GameEventPayoutRow[]
  logEntries: GameEventLogEntry[]
}
