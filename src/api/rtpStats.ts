import { adminFetch, readAdminJson } from './adminSession'
import { BACKEND_GAME, gameFromBackend } from './backendGame'
import type {
  RtpBandStatus,
  RtpChange,
  RtpGame,
  RtpGameOverview,
  RtpHistoryPoint,
  RtpOverview,
  RtpStabilityData,
} from '../types/rtpDashboard'

// RTP Dashboard: GET /rtp-stats/* de quick-money-backend (internal/rtpstats). Exigen sesión de
// admin. Toda cifra de apuestas, pagos o RTP sale solo de rondas COMPLETED (lo garantiza el backend).

interface ApiGameRtp {
  game: string
  targetRtp: number
  minBand: number
  maxBand: number
  correctionWindow: number
  correctionWindowUnlimited: boolean
  window: { rounds: number; roundsWithBets: number; wagered: number; paid: number; rtp: number | null }
  status: RtpBandStatus
}

interface ApiOverview {
  games: ApiGameRtp[]
  houseMargin: { ggr: number; previousGgr: number; changePct: number | null }
  manualResults: { count: number }
  changes: {
    items: { id: number; game: string; previousTarget: number; newTarget: number; automatic: boolean; changedBy: string | null; createdAt: string }[]
    total: number
  }
}

export async function fetchRtpOverview(signal?: AbortSignal): Promise<RtpOverview> {
  const o = await readAdminJson<ApiOverview>(await adminFetch('/rtp-stats/overview', { signal }), 'RTP overview')
  const games: RtpGameOverview[] = []
  for (const g of o.games) {
    const game = gameFromBackend(g.game)
    if (!game) continue
    games.push({
      game,
      targetRtp: g.targetRtp,
      minBand: g.minBand,
      maxBand: g.maxBand,
      correctionWindow: g.correctionWindow,
      correctionWindowUnlimited: g.correctionWindowUnlimited,
      windowRounds: g.window.rounds,
      currentRtp: g.window.rtp,
      status: g.status,
    })
  }
  const changes: RtpChange[] = []
  for (const c of o.changes.items) {
    const game = gameFromBackend(c.game)
    if (game) changes.push({ ...c, game })
  }
  return {
    games,
    houseMargin: { ggr: o.houseMargin.ggr, changePct: o.houseMargin.changePct },
    manualResults: o.manualResults.count,
    changes,
    changesTotal: o.changes.total,
  }
}

interface ApiDay {
  rtp: number | null
  targetRtp: number
}

interface ApiHistory {
  points: { date: string; games: Record<string, ApiDay> }[]
}

// Un punto por día (los últimos `days`, el último hoy) en la zona horaria del navegador.
export async function fetchRtpHistory(days: number, signal?: AbortSignal): Promise<RtpHistoryPoint[]> {
  const params = new URLSearchParams({ days: String(days) })
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (tz) params.set('tz', tz)
  const h = await readAdminJson<ApiHistory>(await adminFetch(`/rtp-stats/history?${params}`, { signal }), 'RTP history')
  return h.points.map(({ date, games }) => {
    const roulette = games[BACKEND_GAME.roulette]
    const quickMoney = games[BACKEND_GAME.quickMoney]
    return {
      date,
      rouletteActual: roulette?.rtp ?? null,
      rouletteTarget: roulette?.targetRtp ?? 0,
      quickMoneyActual: quickMoney?.rtp ?? null,
      quickMoneyTarget: quickMoney?.targetRtp ?? 0,
    }
  })
}

interface ApiStability {
  targetRtp: number
  sigma: number | null
  points: { rounds: number; rtp: number }[]
}

export async function fetchRtpStability(game: RtpGame, signal?: AbortSignal): Promise<RtpStabilityData> {
  const s = await readAdminJson<ApiStability>(
    await adminFetch(`/rtp-stats/stability/${BACKEND_GAME[game]}`, { signal }),
    'RTP stability',
  )
  return { target: s.targetRtp, sigma: s.sigma, points: s.points }
}
