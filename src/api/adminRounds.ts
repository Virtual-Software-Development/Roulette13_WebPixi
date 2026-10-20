import { adminFetch, readAdminJson } from './adminSession'
import { BACKEND_GAME, gameFromBackend } from './backendGame'
import type { RtpGame } from '../types/rtpDashboard'
import type {
  GameEvent,
  GameEventDetail,
  GameEventDraw,
  GameEventPayoutStatus,
  GameEventStatus,
} from '../types/adminGameEvents'
import type {
  GameEventsOverTimeBucket,
  GameEventsOverTimePoint,
  GameEventsOverTimeRange,
  RecentRound,
  ResultFrequencyByGame,
  ResultFrequencyData,
  ResultFrequencyWindow,
} from '../types/adminDashboard'

// Rondas y sus cifras: GET /rounds, /rounds/{id} y /round-stats/* de quick-money-backend
// (internal/roundstats). Exigen sesión de admin. Toda cifra de apuestas/montos sale solo de rondas
// COMPLETED (lo garantiza el backend): las abiertas llegan sin resultado ni estadísticas.

interface ApiResult {
  number?: string
  pick3?: number[]
  pick4?: number[]
}

type ApiRoundStatus = 'SCHEDULED' | 'BETTING_OPEN' | 'BETTING_CLOSED' | 'LIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

interface ApiRound {
  id: number
  code: string
  game: string
  number: string
  status: ApiRoundStatus
  scheduledAt: string
  startedAt: string | null
  endedAt: string | null
  resultDrawnAt: string | null
  result: ApiResult | null
  resultMethod: 'AUTOMATIC' | 'MANUAL' | null
}

interface ApiRoundStats {
  tickets: number
  bets: number
  wagered: number
  paid: number
  ggr: number
  winningBets: number
  winningTickets: number
  rtp: number | null
}

interface ApiRoundDetail extends ApiRound {
  stats: ApiRoundStats | null
  overrides: {
    originalResult: ApiResult | null
    newResult: ApiResult | null
    reason: string
    user: { username: string; fullName: string } | null
    createdAt: string
  }[]
  log: { id: number; createdAt: string; action: string; description: string }[]
  winners: { ticket: string; wagered: number; paid: number; status: string }[]
}

const STATUS_FROM_API: Record<ApiRoundStatus, GameEventStatus> = {
  SCHEDULED: 'scheduled',
  BETTING_OPEN: 'bettingOpen',
  BETTING_CLOSED: 'bettingClosed',
  LIVE: 'live',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

const STATUS_TO_API = Object.fromEntries(Object.entries(STATUS_FROM_API).map(([api, status]) => [status, api])) as Record<
  GameEventStatus,
  ApiRoundStatus
>

function drawOf(game: RtpGame, result: ApiResult | null): GameEventDraw {
  if (game === 'roulette') return { game, result: result?.number ?? null }
  return { game, result: result?.pick3 && result.pick4 ? { pick3: result.pick3, pick4: result.pick4 } : null }
}

// null si el backend manda un juego que esta app no conoce (no debería: solo sirve ruleta y Quick Money).
function toGameEvent(round: ApiRound): GameEvent | null {
  const game = gameFromBackend(round.game)
  if (!game) return null
  return {
    id: String(round.id),
    code: round.code,
    number: round.number,
    status: STATUS_FROM_API[round.status] ?? 'scheduled',
    scheduledAt: round.scheduledAt,
    startTime: round.startedAt,
    endTime: round.endedAt,
    resultDrawnAt: round.resultDrawnAt,
    resultMethod: round.resultMethod === null ? null : round.resultMethod === 'MANUAL' ? 'manual' : 'automatic',
    ...drawOf(game, round.result),
  }
}

// ticket_status de un ticket ganador: WON = premio todavía sin cobrar.
function payoutStatusOf(status: string): GameEventPayoutStatus {
  if (status === 'PAID') return 'paid'
  if (status === 'EXPIRED') return 'expired'
  return 'pending'
}

export interface RoundsQuery {
  game?: RtpGame
  status?: GameEventStatus
  search?: string
  limit: number
  offset: number
}

export interface RoundsPage {
  events: GameEvent[]
  total: number
}

export async function fetchRounds(query: RoundsQuery, signal?: AbortSignal): Promise<RoundsPage> {
  const params = new URLSearchParams({ limit: String(query.limit), offset: String(query.offset) })
  if (query.game) params.set('game', BACKEND_GAME[query.game])
  if (query.status) params.set('status', STATUS_TO_API[query.status])
  if (query.search) params.set('q', query.search)
  const page = await readAdminJson<{ items: ApiRound[]; total: number }>(await adminFetch(`/rounds?${params}`, { signal }), 'rounds')
  return { events: page.items.map(toGameEvent).filter((e): e is GameEvent => e !== null), total: page.total }
}

export async function fetchRound(id: string, signal?: AbortSignal): Promise<GameEventDetail> {
  const round = await readAdminJson<ApiRoundDetail>(await adminFetch(`/rounds/${encodeURIComponent(id)}`, { signal }), 'round')
  const event = toGameEvent(round)
  if (!event) throw new Error(`Unknown game: ${round.game}`)
  return {
    ...event,
    statistics: round.stats,
    overrides: round.overrides.map((o) => ({
      originalResult: drawOf(event.game, o.originalResult),
      newResult: drawOf(event.game, o.newResult),
      reason: o.reason,
      user: o.user ? o.user.fullName || o.user.username : null,
      createdAt: o.createdAt,
    })),
    payouts: round.winners.map((w, index) => ({
      id: `${index}-${w.ticket}`,
      ticket: w.ticket,
      betAmount: w.wagered,
      payoutAmount: w.paid,
      status: payoutStatusOf(w.status),
    })),
    logEntries: round.log.map((entry) => ({ id: String(entry.id), timestamp: entry.createdAt, message: entry.description || entry.action })),
  }
}

// Últimas rondas sorteadas de ambos juegos (Dashboard > Recent Rounds).
export async function fetchRecentRounds(limit: number, signal?: AbortSignal): Promise<RecentRound[]> {
  const { events } = await fetchRounds({ status: 'completed', limit, offset: 0 }, signal)
  const rounds: RecentRound[] = []
  for (const event of events) {
    const base = { id: event.id, time: event.resultDrawnAt ?? event.scheduledAt, roundNumber: `#${event.number}` }
    if (event.game === 'roulette' && event.result !== null) rounds.push({ ...base, game: 'roulette', result: event.result })
    if (event.game === 'quickMoney' && event.result !== null) rounds.push({ ...base, game: 'quickMoney', result: event.result })
  }
  return rounds
}

export interface GamePeriodTotals {
  rounds: number
  cancelledRounds: number
  failedRounds: number
  tickets: number
  bets: number
  machines: number
  wagered: number
  paid: number
  ggr: number
  rtp: number | null
}

export interface PeriodStats {
  byGame: Partial<Record<RtpGame, GamePeriodTotals>>
  totals: GamePeriodTotals
}

export interface RoundSummary {
  current: PeriodStats
  previous: PeriodStats
}

type ApiPeriod = { games: (GamePeriodTotals & { game: string })[]; totals: GamePeriodTotals }

function toPeriod(period: ApiPeriod): PeriodStats {
  const byGame: PeriodStats['byGame'] = {}
  for (const { game, ...totals } of period.games) {
    const key = gameFromBackend(game)
    if (key) byGame[key] = totals
  }
  return { byGame, totals: period.totals }
}

// Cifras de [from, to) y del período anterior de igual duración.
export async function fetchRoundSummary(from: Date, to: Date, signal?: AbortSignal): Promise<RoundSummary> {
  const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
  const summary = await readAdminJson<{ current: ApiPeriod; previous: ApiPeriod }>(
    await adminFetch(`/round-stats/summary?${params}`, { signal }),
    'round summary',
  )
  return { current: toPeriod(summary.current), previous: toPeriod(summary.previous) }
}

export interface RoundTimeline {
  bucket: GameEventsOverTimeBucket
  points: GameEventsOverTimePoint[]
}

// Rondas terminadas por hora (24h) o por día, en la zona horaria del navegador.
export async function fetchRoundTimeline(range: GameEventsOverTimeRange, signal?: AbortSignal): Promise<RoundTimeline> {
  const params = new URLSearchParams({ range })
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (tz) params.set('tz', tz)
  return readAdminJson<RoundTimeline>(await adminFetch(`/round-stats/timeline?${params}`, { signal }), 'round timeline')
}

type ApiFrequency = Record<string, (ResultFrequencyData & { window: number })[]>

export async function fetchResultFrequency(signal?: AbortSignal): Promise<ResultFrequencyByGame> {
  const data = await readAdminJson<ApiFrequency>(await adminFetch('/round-stats/result-frequency', { signal }), 'result frequency')
  const empty = (): Record<ResultFrequencyWindow, ResultFrequencyData> => ({
    100: { rounds: 0, draws: 0, buckets: [] },
    500: { rounds: 0, draws: 0, buckets: [] },
    1000: { rounds: 0, draws: 0, buckets: [] },
  })
  const out: ResultFrequencyByGame = { roulette: empty(), quickMoney: empty() }
  for (const [juego, windows] of Object.entries(data)) {
    const game = gameFromBackend(juego)
    if (!game) continue
    for (const { window, rounds, draws, buckets } of windows) {
      if (window === 100 || window === 500 || window === 1000) out[game][window] = { rounds, draws, buckets }
    }
  }
  return out
}
