import type { QuickMoneyDrawResult } from './adminDashboard'
import type { RtpGame } from './rtpDashboard'

// Reutiliza RtpGame ('roulette'|'quickMoney') -- mismo set de juegos que RTP Management/Next
// Results, no existe un juego distinto para Game Events (ver GAME_LABEL_KEY/RTP_GAME_ICON_URLS).
export type GameEventGame = RtpGame

// round_status del backend (GET /rounds de quick-money-backend).
export type GameEventStatus = 'scheduled' | 'bettingOpen' | 'bettingClosed' | 'live' | 'completed' | 'failed' | 'cancelled'

// Solo de rondas ya sorteadas (COMPLETED): el admin nunca ve apuestas de una ronda abierta.
export interface GameEventStatistics {
  tickets: number
  bets: number
  wagered: number
  paid: number
  ggr: number
  winningBets: number
  winningTickets: number
  // % pagado sobre apostado; null sin apuestas.
  rtp: number | null
}

export type GameEventPayoutStatus = 'paid' | 'pending' | 'expired'

// Un ticket ganador -- los tickets son anónimos (no hay jugadores), el código viene enmascarado y
// sin la máquina que lo vendió (nada junto al ticket identifica terminal, banca ni persona).
export interface GameEventPayoutRow {
  id: string
  ticket: string
  betAmount: number
  payoutAmount: number
  status: GameEventPayoutStatus
}

export interface GameEventLogEntry {
  id: string
  timestamp: string
  // Texto que guarda el backend (log.description), no un i18n key.
  message: string
}

export interface GameEventOverride {
  originalResult: GameEventDraw
  newResult: GameEventDraw
  reason: string
  // null = cambiado desde Next Results sin sesión.
  user: string | null
  createdAt: string
}

// null mientras la ronda no se sorteó. Roulette: la casilla ('0'..'36', '00'); Quick Money: el
// Pick 3 y el Pick 4 del mismo sorteo.
export type GameEventDraw = { game: 'roulette'; result: string | null } | { game: 'quickMoney'; result: QuickMoneyDrawResult | null }

interface GameEventBase {
  id: string
  code: string
  // Número del sorteo del día ("0533").
  number: string
  status: GameEventStatus
  scheduledAt: string
  startTime: string | null
  endTime: string | null
  resultDrawnAt: string | null
  resultMethod: 'automatic' | 'manual' | null
}

export type GameEvent = GameEventBase & GameEventDraw

export type GameEventDetail = GameEvent & {
  statistics: GameEventStatistics | null
  overrides: GameEventOverride[]
  payouts: GameEventPayoutRow[]
  logEntries: GameEventLogEntry[]
}
