import { adminFetch, readAdminJson } from './adminSession'
import { BACKEND_GAME, gameFromBackend } from './backendGame'
import type {
  ReportActivity,
  ReportData,
  ReportGame,
  ReportGameData,
  ReportGameFilter,
  ReportMachinesData,
  ReportPrizeList,
  ReportRounds,
  ReportRtpData,
  ReportSubstitution,
  ReportType,
  ReportUnpaidPrizes,
  RecentReportRow,
  RecentReportFormat,
} from '../types/adminReports'
import { REPORT_TIME_ZONE, reportNow } from '../utils/reportFormat'
import { comparisonPeriod, toIsoDate, type ReportPeriod, type ReportPeriodKind } from '../utils/reportPeriod'

// Datos de Reports: GET /reports/* de quick-money-backend (internal/reports). Exigen sesión de
// admin. Toda cifra de tickets, apuestas o montos sale solo de rondas COMPLETED (lo garantiza el
// backend). Los períodos van como días yyyy-mm-dd (ambos inclusive) en la zona de Reportes.

export const REPORT_GAMES: ReportGame[] = ['roulette', 'quickMoney']

export const gamesOf = (filter: ReportGameFilter): ReportGame[] => (filter === 'all' ? REPORT_GAMES : [filter])

export const QUICK_MONEY_RESULT_SEPARATOR = ' · '

interface ApiResult {
  number?: string
  pick3?: number[]
  pick4?: number[]
}

interface ApiUser {
  username: string
  fullName: string
}

// Las Date de Reports son hora de pared de Santo Domingo (ver reportFormat.ts).
const toReportDate = (iso: string) => reportNow(new Date(iso))

// null si el backend manda un juego que esta app no conoce (no debería: solo sirve ruleta y Quick Money).
function knownGame<T extends { game: string }>(row: T): (Omit<T, 'game'> & { game: ReportGame }) | null {
  const game = gameFromBackend(row.game)
  return game ? { ...row, game } : null
}

const isPresent = <T>(value: T | null): value is T => value !== null

export function resultText(result: ApiResult | null): string {
  if (!result) return ''
  if (result.number !== undefined) return result.number
  if (result.pick3 && result.pick4) return `${result.pick3.join('')}${QUICK_MONEY_RESULT_SEPARATOR}${result.pick4.join('')}`
  return ''
}

const userName = (user: ApiUser | null) => (user ? user.fullName || user.username : null)

async function getReport<T>(path: string, period: ReportPeriod, signal?: AbortSignal, extra?: Record<string, string>): Promise<T> {
  const params = new URLSearchParams({ from: toIsoDate(period.start), to: toIsoDate(period.end), tz: REPORT_TIME_ZONE, ...extra })
  return readAdminJson<T>(await adminFetch(`/reports/${path}?${params}`, { signal }), `reports/${path}`)
}

interface ApiActivity {
  days: { date: string; game: string; rounds: number; tickets: number; bets: number; wagered: number; paid: number }[]
  hours: { weekday: number; hour: number; game: string; tickets: number; wagered: number }[]
}

export async function fetchReportActivity(period: ReportPeriod, signal?: AbortSignal): Promise<ReportActivity> {
  const data = await getReport<ApiActivity>('activity', period, signal)
  return {
    days: data.days
      .map(knownGame)
      .filter(isPresent)
      .map(({ wagered, paid, ...day }) => ({ ...day, sales: wagered, prizes: paid })),
    hours: data.hours
      .map(knownGame)
      .filter(isPresent)
      // El backend numera 1 = lunes … 7 = domingo.
      .map(({ weekday, wagered, ...hour }) => ({ ...hour, weekday: weekday - 1, sales: wagered })),
  }
}

interface ApiGame {
  betTypes: { game: string; code: string; digits: number | null; name: string; bets: number; wagered: number; paid: number; theoreticalRtp: number | null }[]
  rouletteRounds: number
  rouletteFrequency: { key: string; count: number }[]
  quickMoneyDigits: { draws: number; pick3: number[][]; pick4: number[][] }
  topNumbers: { number: string; betTypes: string[]; bets: number; wagered: number }[]
}

export async function fetchReportGame(period: ReportPeriod, signal?: AbortSignal): Promise<ReportGameData> {
  const data = await getReport<ApiGame>('game', period, signal)
  return {
    betTypes: data.betTypes
      .map(knownGame)
      .filter(isPresent)
      .map(({ wagered, paid, ...row }) => ({ ...row, amount: wagered, prizes: paid })),
    rouletteRounds: data.rouletteRounds,
    rouletteFrequency: data.rouletteFrequency.map(({ key, count }) => ({ slot: key, count })),
    digits: data.quickMoneyDigits,
    topNumbers: data.topNumbers.map(({ wagered, ...row }) => ({ ...row, amount: wagered })),
  }
}

interface ApiRounds {
  items: {
    id: number
    code: string
    scheduledAt: string
    result: ApiResult | null
    manual: boolean
    manualBy: ApiUser | null
    tickets: number
    bets: number
    wagered: number
    paid: number
  }[]
  truncated: boolean
}

export async function fetchReportRounds(period: ReportPeriod, game: ReportGame, signal?: AbortSignal): Promise<ReportRounds> {
  const data = await getReport<ApiRounds>('rounds', period, signal, { game: BACKEND_GAME[game] })
  return {
    truncated: data.truncated,
    items: data.items.map((r) => ({
      id: String(r.id),
      code: r.code,
      at: toReportDate(r.scheduledAt),
      result: resultText(r.result),
      manual: r.manual,
      user: userName(r.manualBy),
      tickets: r.tickets,
      bets: r.bets,
      amount: r.wagered,
      prizes: r.paid,
    })),
  }
}

interface ApiMachines {
  machines: { id: number; name: string; isActive: boolean; banca: { id: number; name: string }; consorcio: { id: number; name: string } }[]
  totals: {
    machineId: number
    game: string
    tickets: number
    wagered: number
    paid: number
    collected: number
    pending: number
    expired: number
    lastSaleAt: string | null
  }[]
  amountRanges: { game: string; index: number; tickets: number }[]
}

export async function fetchReportMachines(period: ReportPeriod, signal?: AbortSignal): Promise<ReportMachinesData> {
  const data = await getReport<ApiMachines>('machines', period, signal)
  return {
    machines: data.machines.map((m) => ({
      id: String(m.id),
      name: m.name,
      isActive: m.isActive,
      banca: { id: String(m.banca.id), name: m.banca.name },
      consorcio: { id: String(m.consorcio.id), name: m.consorcio.name },
    })),
    totals: data.totals
      .map(knownGame)
      .filter(isPresent)
      .map((row) => ({
        machineId: String(row.machineId),
        game: row.game,
        tickets: row.tickets,
        sales: row.wagered,
        prizes: row.paid,
        lastSaleAt: row.lastSaleAt ? toReportDate(row.lastSaleAt) : null,
        paid: row.collected,
        pending: row.pending,
        expired: row.expired,
      })),
    amountRanges: data.amountRanges.map(knownGame).filter(isPresent),
  }
}

interface ApiPrizeList {
  count: number
  amount: number
  truncated: boolean
  items: { ticket: string; game: string; round: string; soldAt: string; prize: number; expiresAt: string }[]
}

function toPrizeList(list: ApiPrizeList): ReportPrizeList {
  return {
    count: list.count,
    amount: list.amount,
    truncated: list.truncated,
    items: list.items
      .map(knownGame)
      .filter(isPresent)
      .map((t) => ({
        code: t.ticket,
        game: t.game,
        round: t.round,
        soldAt: toReportDate(t.soldAt),
        prize: t.prize,
        expiresAt: toReportDate(t.expiresAt),
      })),
  }
}

export async function fetchReportUnpaidPrizes(period: ReportPeriod, signal?: AbortSignal): Promise<ReportUnpaidPrizes> {
  const data = await getReport<{ cutoff: string; pending: ApiPrizeList; expired: ApiPrizeList }>('unpaid-prizes', period, signal)
  return { cutoff: toReportDate(data.cutoff), pending: toPrizeList(data.pending), expired: toPrizeList(data.expired) }
}

interface ApiRtp {
  games: { game: string; target: number; minBand: number; maxBand: number }[]
  targets: { date: string; game: string; target: number }[]
  changes: { at: string; game: string; user: ApiUser | null; from: number; to: number }[]
}

export async function fetchReportRtp(period: ReportPeriod, signal?: AbortSignal): Promise<ReportRtpData> {
  const data = await getReport<ApiRtp>('rtp', period, signal)
  return {
    games: data.games.map(knownGame).filter(isPresent),
    targets: data.targets.map(knownGame).filter(isPresent),
    changes: data.changes
      .map(knownGame)
      .filter(isPresent)
      .map((c) => ({ ...c, at: toReportDate(c.at), user: userName(c.user) })),
  }
}

interface ApiSubstitutions {
  items: {
    round: string
    game: string
    scheduledAt: string
    at: string
    user: ApiUser | null
    originalResult: ApiResult | null
    newResult: ApiResult | null
    reason: string
    paidOriginal: number
    paidNew: number
  }[]
}

export async function fetchReportSubstitutions(period: ReportPeriod, signal?: AbortSignal): Promise<ReportSubstitution[]> {
  const data = await getReport<ApiSubstitutions>('substitutions', period, signal)
  return data.items
    .map(knownGame)
    .filter(isPresent)
    .map((s) => ({
      round: s.round,
      game: s.game,
      roundAt: toReportDate(s.scheduledAt),
      at: toReportDate(s.at),
      user: s.user,
      originalResult: resultText(s.originalResult),
      newResult: resultText(s.newResult),
      reason: s.reason,
      paidOriginal: s.paidOriginal,
      paidNew: s.paidNew,
    }))
}

export interface ReportDataRequest {
  type: ReportType
  period: ReportPeriod
  kind: ReportPeriodKind
  game: ReportGameFilter
  // Archivo de "Todos los juegos" con una sección por juego: hace falta el detalle de cada juego.
  byGame?: boolean
}

// Pide al backend solo lo que el documento del reporte usa.
export async function fetchReportData({ type, period, kind, game, byGame }: ReportDataRequest, signal?: AbortSignal): Promise<ReportData> {
  const detailGames = game === 'all' ? (byGame ? REPORT_GAMES : []) : [game]
  const rounds = (games: ReportGame[]) =>
    Promise.all(games.map(async (g) => [g, await fetchReportRounds(period, g, signal)] as const)).then((entries) => Object.fromEntries(entries))

  const activity = fetchReportActivity(period, signal)
  switch (type) {
    case 'summary':
    case 'weeklyReport':
    case 'monthlyReport': {
      const [current, previous] = await Promise.all([activity, kind === 'range' ? undefined : fetchReportActivity(comparisonPeriod(period, kind), signal)])
      return { activity: current, previousActivity: previous }
    }
    case 'gameReport': {
      const [current, gameData, roundsByGame] = await Promise.all([activity, detailGames.length > 0 ? fetchReportGame(period, signal) : undefined, rounds(detailGames)])
      return { activity: current, game: gameData, rounds: roundsByGame }
    }
    case 'salesActivity': {
      const [current, machines] = await Promise.all([activity, fetchReportMachines(period, signal)])
      return { activity: current, machines }
    }
    case 'financialReport': {
      const [current, machines, unpaidPrizes] = await Promise.all([activity, fetchReportMachines(period, signal), fetchReportUnpaidPrizes(period, signal)])
      return { activity: current, machines, unpaidPrizes }
    }
    case 'rtpAnalysis': {
      const withDetail = detailGames.length > 0
      const [current, rtp, gameData, substitutions, roundsByGame] = await Promise.all([
        activity,
        fetchReportRtp(period, signal),
        withDetail ? fetchReportGame(period, signal) : undefined,
        withDetail ? fetchReportSubstitutions(period, signal) : undefined,
        rounds(detailGames.filter((g) => g === 'quickMoney')),
      ])
      return { activity: current, rtp, game: gameData, substitutions, rounds: roundsByGame }
    }
    case 'manualSubstitutions': {
      const previous = comparisonPeriod(period, 'range')
      const [current, substitutions, previousActivity, previousSubstitutions] = await Promise.all([
        activity,
        fetchReportSubstitutions(period, signal),
        fetchReportActivity(previous, signal),
        fetchReportSubstitutions(previous, signal),
      ])
      return { activity: current, substitutions, previousActivity, previousSubstitutions }
    }
  }
}

// Registra en la bitácora del backend (EXPORT_DATA) un reporte ya descargado. Los archivos se arman
// en el navegador, así que es el panel quien avisa.
export async function logReportDownload(report: RecentReportRow, format: RecentReportFormat): Promise<void> {
  const res = await adminFetch('/reports/downloads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: report.type,
      format,
      from: report.period.start,
      to: report.period.end,
      game: report.game === 'all' ? 'all' : BACKEND_GAME[report.game],
    }),
  })
  if (res.status !== 204) await readAdminJson(res, 'log report download')
}
