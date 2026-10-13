import { ADMIN_USERS } from './adminUsersMockData'
import { dayKey, hashSeed, hashUnit, seededRandom } from './mockRandom'
import { addDays, dayElapsedFraction, periodDays, startOfDay, type ReportPeriod } from '../utils/reportPeriod'
import type { ReportGame, ReportGameFilter } from '../types/adminReports'

// Mock TEMPORAL de los reportes (definidos por las respuestas del cliente, v1.1) -- no existe todavía un endpoint
// de reportes. Todo sale de rondas/sorteos simulados por día y por juego (semilla = fecha + juego),
// y de ahí se derivan los totales por día, por juego, por máquina/banca, por hora y por tipo de
// apuesta: las tablas cuadran entre sí. Reemplazar por el fetch real no toca los componentes.

export const REPORT_GAMES: ReportGame[] = ['roulette', 'pick3', 'pick4']
const GAME_INDEX: Record<ReportGame, number> = { roulette: 1, pick3: 2, pick4: 3 }

export const gamesOf = (filter: ReportGameFilter): ReportGame[] => (filter === 'all' ? REPORT_GAMES : [filter])

// ---------------------------------------------------------------------------------------------
// Organización (consorcio -> banca -> máquina). Dos máquinas sin ventas, para "Máquinas sin ventas".

export interface Consorcio {
  id: string
  name: string
}
export interface Banca {
  id: string
  consorcioId: string
  name: string
}
export interface Machine {
  id: string
  bancaId: string
  code: string
  weight: number
}

export const CONSORCIOS: Consorcio[] = [
  { id: 'c1', name: 'Consorcio Cibao' },
  { id: 'c2', name: 'Consorcio Capital' },
]

export const BANCAS: Banca[] = [
  { id: 'b1', consorcioId: 'c1', name: 'Banca Santiago Centro' },
  { id: 'b2', consorcioId: 'c1', name: 'Banca La Vega' },
  { id: 'b3', consorcioId: 'c1', name: 'Banca Puerto Plata' },
  { id: 'b4', consorcioId: 'c2', name: 'Banca Naco' },
  { id: 'b5', consorcioId: 'c2', name: 'Banca Los Mina' },
]

export const MACHINES: Machine[] = [
  { id: 'm1', bancaId: 'b1', code: 'SC-01', weight: 1.3 },
  { id: 'm2', bancaId: 'b1', code: 'SC-02', weight: 1.1 },
  { id: 'm3', bancaId: 'b1', code: 'SC-03', weight: 0.8 },
  { id: 'm4', bancaId: 'b2', code: 'LV-01', weight: 0.9 },
  { id: 'm5', bancaId: 'b2', code: 'LV-02', weight: 0.6 },
  { id: 'm6', bancaId: 'b3', code: 'PP-01', weight: 0.7 },
  { id: 'm7', bancaId: 'b3', code: 'PP-02', weight: 0 },
  { id: 'm8', bancaId: 'b4', code: 'NA-01', weight: 1.2 },
  { id: 'm9', bancaId: 'b4', code: 'NA-02', weight: 1 },
  { id: 'm10', bancaId: 'b5', code: 'LM-01', weight: 0.8 },
  { id: 'm11', bancaId: 'b5', code: 'LM-02', weight: 0.5 },
  { id: 'm12', bancaId: 'b5', code: 'LM-03', weight: 0 },
]

export const bancaById = (id: string) => BANCAS.find((b) => b.id === id)!
export const consorcioById = (id: string) => CONSORCIOS.find((c) => c.id === id)!
export const machineById = (id: string) => MACHINES.find((m) => m.id === id)!

// Solo admin/operator pueden sustituir resultados (mismo criterio que manualSubstitutionsMockData).
const OPERATOR_NAMES = ADMIN_USERS.filter((u) => u.role !== 'viewer').map((u) => u.fullName)

// ---------------------------------------------------------------------------------------------
// Parámetros de la simulación.

// Ruleta cada 60 s, lotería cada 90 s (game_schedule_config.intervalo_segundos en el seed).
const ROUND_INTERVAL_SECONDS: Record<ReportGame, number> = { roulette: 60, pick3: 90, pick4: 90 }
export const roundsPerDay = (game: ReportGame) => 86400 / ROUND_INTERVAL_SECONDS[game]

// Tickets por ronda en la hora pico; el resto del día escala por HOURLY_SHAPE.
const PEAK_TICKETS_PER_ROUND: Record<ReportGame, number> = { roulette: 4, pick3: 2.2, pick4: 1.6 }
const AVG_TICKET_AMOUNT: Record<ReportGame, number> = { roulette: 95, pick3: 60, pick4: 75 }
const BETS_PER_TICKET: Record<ReportGame, number> = { roulette: 2.4, pick3: 1.7, pick4: 1.6 }
// RTP medio de la simulación. Pick 3/4 no tienen tabla de pagos todavía: valor solo de mock.
const MOCK_RTP: Record<ReportGame, number> = { roulette: 0.9474, pick3: 0.55, pick4: 0.55 }
const WIN_PROBABILITY: Record<ReportGame, number> = { roulette: 0.5, pick3: 0.12, pick4: 0.08 }
// Probabilidad de que una ronda de ruleta tenga el resultado cambiado a mano en Next Results.
const MANUAL_RESULT_PROBABILITY = 0.0035

const HOURLY_SHAPE = [
  0.22, 0.16, 0.11, 0.08, 0.07, 0.08, 0.12, 0.2, 0.3, 0.38, 0.44, 0.5, 0.62, 0.6, 0.52, 0.5, 0.56, 0.66, 0.78, 0.9, 1, 0.98, 0.84, 0.5,
]
// Por día de la semana (getDay: 0 = domingo).
const DAY_OF_WEEK_FACTOR = [1.18, 0.82, 0.8, 0.85, 0.9, 1.12, 1.3]

export const ROULETTE_SLOTS = ['0', '00', ...Array.from({ length: 36 }, (_, i) => String(i + 1))]
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

export const ROULETTE_BET_TYPES = ['pleno', 'caballo', 'calle', 'esquina', 'cesta', 'linea', 'columna', 'docena', 'color', 'paridad', 'altura'] as const
export const LOTTERY_BET_TYPES = ['straight', 'box', 'front_pair', 'back_pair'] as const
export type ReportBetType = (typeof ROULETTE_BET_TYPES)[number] | (typeof LOTTERY_BET_TYPES)[number]

// Casillas cubiertas y pago "a 1" (roulette_payout_table del seed). RTP teórico = casillas × (pago
// + 1) ÷ 38: 94,74 % en todas excepto la cesta (92,11 %).
const ROULETTE_PAYOUT: Record<(typeof ROULETTE_BET_TYPES)[number], [number, number]> = {
  pleno: [1, 35],
  caballo: [2, 17],
  calle: [3, 11],
  esquina: [4, 8],
  cesta: [5, 6],
  linea: [6, 5],
  columna: [12, 2],
  docena: [12, 2],
  color: [18, 1],
  paridad: [18, 1],
  altura: [18, 1],
}

// Pick 3/4: la tabla de pagos todavía no está cargada (lottery_payout_table vacía) -> sin teórico.
export function theoreticalRtp(game: ReportGame, betType: ReportBetType): number | null {
  if (game !== 'roulette') return null
  const [slots, payout] = ROULETTE_PAYOUT[betType as (typeof ROULETTE_BET_TYPES)[number]]
  return ((slots * (payout + 1)) / 38) * 100
}

export const betTypesOf = (game: ReportGame): readonly ReportBetType[] => (game === 'roulette' ? ROULETTE_BET_TYPES : LOTTERY_BET_TYPES)

// Reparto del monto apostado por tipo de apuesta.
const BET_TYPE_SHARE: Record<ReportBetType, number> = {
  pleno: 0.22,
  caballo: 0.08,
  calle: 0.05,
  esquina: 0.06,
  cesta: 0.01,
  linea: 0.04,
  columna: 0.1,
  docena: 0.12,
  color: 0.18,
  paridad: 0.08,
  altura: 0.06,
  straight: 0.45,
  box: 0.3,
  front_pair: 0.13,
  back_pair: 0.12,
}

export const RTP_BAND = { min: 92, max: 98 }

// ---------------------------------------------------------------------------------------------
// Totales.

export interface Totals {
  rounds: number
  tickets: number
  bets: number
  sales: number
  prizes: number
}

export const emptyTotals = (): Totals => ({ rounds: 0, tickets: 0, bets: 0, sales: 0, prizes: 0 })

export function addTotals(target: Totals, source: Totals): Totals {
  target.rounds += source.rounds
  target.tickets += source.tickets
  target.bets += source.bets
  target.sales += source.sales
  target.prizes += source.prizes
  return target
}

export const balanceOf = (t: Pick<Totals, 'sales' | 'prizes'>) => t.sales - t.prizes
export const rtpOf = (t: Pick<Totals, 'sales' | 'prizes'>) => (t.sales > 0 ? (t.prizes / t.sales) * 100 : null)
export const avgTicketOf = (t: Pick<Totals, 'sales' | 'tickets'>) => (t.tickets > 0 ? t.sales / t.tickets : 0)

const round2 = (value: number) => Math.round(value * 100) / 100

// ---------------------------------------------------------------------------------------------
// Rondas/sorteos simulados.

export interface RoundRecord {
  id: string
  at: Date
  game: ReportGame
  result: string
  manual: boolean
  user: string | null
  tickets: number
  bets: number
  amount: number
  prizes: number
}

const roundsCache = new Map<string, RoundRecord[]>()

function simulateResult(game: ReportGame, random: () => number): string {
  if (game === 'roulette') return ROULETTE_SLOTS[Math.floor(random() * 38)]
  const digits = game === 'pick3' ? 3 : 4
  return Array.from({ length: digits }, () => Math.floor(random() * 10)).join('')
}

// Rondas de un día y un juego, en orden cronológico. El día de hoy solo hasta ahora.
export function dayRounds(day: Date, game: ReportGame, now: Date): RoundRecord[] {
  const count = Math.floor(roundsPerDay(game) * dayElapsedFraction(day, now))
  const cacheKey = `${dayKey(day)}-${game}-${count}`
  const cached = roundsCache.get(cacheKey)
  if (cached) return cached

  const random = seededRandom(hashSeed(dayKey(day), GAME_INDEX[game]))
  const interval = ROUND_INTERVAL_SECONDS[game]
  const dayFactor = DAY_OF_WEEK_FACTOR[day.getDay()]
  const prefix = game === 'roulette' ? 'R' : game === 'pick3' ? 'P3' : 'P4'
  const rounds: RoundRecord[] = []

  for (let k = 0; k < count; k++) {
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, k * interval)
    const mean = PEAK_TICKETS_PER_ROUND[game] * HOURLY_SHAPE[at.getHours()] * dayFactor
    const tickets = Math.max(0, Math.round(mean * (0.4 + random() * 1.2)))
    const bets = tickets === 0 ? 0 : Math.max(tickets, Math.round(tickets * BETS_PER_TICKET[game] * (0.7 + random() * 0.6)))
    const amount = tickets === 0 ? 0 : round2(tickets * AVG_TICKET_AMOUNT[game] * (0.6 + random() * 0.8))
    // Premio ÷ monto con media = RTP: gana con probabilidad p, y en ese caso U(0, 2·RTP/p).
    const win = random() < WIN_PROBABILITY[game]
    const multiplier = win ? random() * ((2 * MOCK_RTP[game]) / WIN_PROBABILITY[game]) : 0
    const result = simulateResult(game, random)
    const manual = game === 'roulette' && random() < MANUAL_RESULT_PROBABILITY
    rounds.push({
      id: `${prefix}-${dayKey(day)}-${String(k + 1).padStart(4, '0')}`,
      at,
      game,
      result,
      manual,
      user: manual ? OPERATOR_NAMES[Math.floor(random() * OPERATOR_NAMES.length)] : null,
      tickets,
      bets,
      amount,
      prizes: round2(amount * multiplier),
    })
  }

  roundsCache.set(cacheKey, rounds)
  return rounds
}

export function periodRounds(period: ReportPeriod, game: ReportGame, now: Date): RoundRecord[] {
  return periodDays(period).flatMap((day) => dayRounds(day, game, now))
}

// ---------------------------------------------------------------------------------------------
// Resumen de un día y un juego (con reparto por máquina, hora y tipo de apuesta).

interface MachineCell extends Totals {
  machineId: string
  lastSaleAt: Date | null
}

interface DaySummary {
  totals: Totals
  byHour: { tickets: number; sales: number }[]
  byMachine: MachineCell[]
  byBetType: { type: ReportBetType; bets: number; amount: number; prizes: number }[]
}

const summaryCache = new Map<string, DaySummary>()

function normalize(weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  return weights.map((w) => (sum > 0 ? w / sum : 0))
}

// Reparte un entero entre partes según pesos sin perder unidades (resto mayor).
function splitInteger(total: number, shares: number[]): number[] {
  const raw = shares.map((s) => s * total)
  const floors = raw.map(Math.floor)
  let remaining = total - floors.reduce((a, b) => a + b, 0)
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0])
  for (const [, i] of order) {
    if (remaining <= 0) break
    floors[i]++
    remaining--
  }
  return floors
}

function daySummary(day: Date, game: ReportGame, now: Date): DaySummary {
  const rounds = dayRounds(day, game, now)
  const cacheKey = `${dayKey(day)}-${game}-${rounds.length}`
  const cached = summaryCache.get(cacheKey)
  if (cached) return cached

  const totals = emptyTotals()
  const byHour = Array.from({ length: 24 }, () => ({ tickets: 0, sales: 0 }))
  for (const r of rounds) {
    totals.tickets += r.tickets
    totals.bets += r.bets
    totals.sales += r.amount
    totals.prizes += r.prizes
    const hour = byHour[r.at.getHours()]
    hour.tickets += r.tickets
    hour.sales += r.amount
  }
  totals.rounds = rounds.length

  // Máquinas: peso propio × ruido del día; los premios con su propio ruido (no todas pagan igual).
  const random = seededRandom(hashSeed(dayKey(day), GAME_INDEX[game], 77))
  const salesShares = normalize(MACHINES.map((m) => m.weight * (0.75 + random() * 0.5)))
  const prizeShares = normalize(salesShares.map((s) => s * (0.6 + random() * 0.8)))
  const ticketSplit = splitInteger(totals.tickets, salesShares)
  const betSplit = splitInteger(totals.bets, salesShares)
  const lastRoundAt = rounds.length > 0 ? rounds[rounds.length - 1].at : null
  const byMachine: MachineCell[] = MACHINES.map((m, i) => ({
    machineId: m.id,
    rounds: totals.rounds,
    tickets: ticketSplit[i],
    bets: betSplit[i],
    sales: totals.sales * salesShares[i],
    prizes: totals.prizes * prizeShares[i],
    lastSaleAt:
      ticketSplit[i] > 0 && lastRoundAt ? new Date(lastRoundAt.getTime() - Math.floor(random() * 50) * 60_000) : null,
  }))

  // Tipos de apuesta: monto por participación con ruido; premios por RTP teórico con ruido,
  // reescalados para sumar los premios del día.
  const types = betTypesOf(game)
  const amountShares = normalize(types.map((t) => BET_TYPE_SHARE[t] * (0.8 + random() * 0.4)))
  const countShares = normalize(types.map((t) => BET_TYPE_SHARE[t] * (0.7 + random() * 0.6)))
  const prizeWeights = normalize(types.map((t, i) => amountShares[i] * ((theoreticalRtp(game, t) ?? 100) / 100) * (0.85 + random() * 0.3)))
  const betCounts = splitInteger(totals.bets, countShares)
  const byBetType = types.map((type, i) => ({
    type,
    bets: betCounts[i],
    amount: totals.sales * amountShares[i],
    prizes: totals.prizes * prizeWeights[i],
  }))

  const summary = { totals, byHour, byMachine, byBetType }
  summaryCache.set(cacheKey, summary)
  return summary
}

// ---------------------------------------------------------------------------------------------
// Agregados por período.

export function totalsFor(period: ReportPeriod, filter: ReportGameFilter, now: Date): Totals {
  const totals = emptyTotals()
  for (const day of periodDays(period)) for (const game of gamesOf(filter)) addTotals(totals, daySummary(day, game, now).totals)
  return totals
}

export function totalsByDay(period: ReportPeriod, filter: ReportGameFilter, now: Date): { date: Date; totals: Totals }[] {
  return periodDays(period).map((date) => {
    const totals = emptyTotals()
    for (const game of gamesOf(filter)) addTotals(totals, daySummary(date, game, now).totals)
    return { date, totals }
  })
}

export function totalsByGame(period: ReportPeriod, now: Date): { game: ReportGame; totals: Totals }[] {
  return REPORT_GAMES.map((game) => ({ game, totals: totalsFor(period, game, now) }))
}

export interface BetTypeTotals {
  type: ReportBetType
  bets: number
  amount: number
  prizes: number
}

export function betTypeTotals(period: ReportPeriod, game: ReportGame, now: Date): BetTypeTotals[] {
  const rows = betTypesOf(game).map((type) => ({ type, bets: 0, amount: 0, prizes: 0 }))
  for (const day of periodDays(period)) {
    daySummary(day, game, now).byBetType.forEach((row, i) => {
      rows[i].bets += row.bets
      rows[i].amount += row.amount
      rows[i].prizes += row.prizes
    })
  }
  return rows
}

export function hourlyActivity(period: ReportPeriod, filter: ReportGameFilter, now: Date): { hour: number; tickets: number; sales: number }[] {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, tickets: 0, sales: 0 }))
  for (const day of periodDays(period)) {
    for (const game of gamesOf(filter)) {
      daySummary(day, game, now).byHour.forEach((h, i) => {
        hours[i].tickets += h.tickets
        hours[i].sales += h.sales
      })
    }
  }
  return hours
}

// Peak Hours de la pantalla: ventas y tickets por día de la semana (0 = lunes) y hora, sumando
// todos los días del período.
export function weekdayHourActivity(period: ReportPeriod, filter: ReportGameFilter, now: Date): { sales: number[][]; tickets: number[][] } {
  const grid = () => Array.from({ length: 7 }, () => Array<number>(24).fill(0))
  const sales = grid()
  const tickets = grid()
  for (const day of periodDays(period)) {
    const weekday = (day.getDay() + 6) % 7
    for (const game of gamesOf(filter)) {
      daySummary(day, game, now).byHour.forEach((h, hour) => {
        sales[weekday][hour] += h.sales
        tickets[weekday][hour] += h.tickets
      })
    }
  }
  return { sales, tickets }
}

export interface MachineActivity {
  machine: Machine
  totals: Totals
  salesByGame: Record<ReportGame, number>
  lastSaleAt: Date | null
}

export function machineActivity(period: ReportPeriod, filter: ReportGameFilter, now: Date): MachineActivity[] {
  const rows = MACHINES.map((machine) => ({
    machine,
    totals: emptyTotals(),
    salesByGame: { roulette: 0, pick3: 0, pick4: 0 } as Record<ReportGame, number>,
    lastSaleAt: null as Date | null,
  }))
  for (const day of periodDays(period)) {
    for (const game of gamesOf(filter)) {
      daySummary(day, game, now).byMachine.forEach((cell, i) => {
        const row = rows[i]
        row.totals.tickets += cell.tickets
        row.totals.bets += cell.bets
        row.totals.sales += cell.sales
        row.totals.prizes += cell.prizes
        row.salesByGame[game] += cell.sales
        if (cell.lastSaleAt && (!row.lastSaleAt || cell.lastSaleAt > row.lastSaleAt)) row.lastSaleAt = cell.lastSaleAt
      })
    }
  }
  return rows
}

// Distribución de tickets por rango de monto. Rangos del documento, ajustables.
export const AMOUNT_RANGES = [
  { key: 'upTo100', max: 100 },
  { key: 'from101To500', max: 500 },
  { key: 'from501To1000', max: 1000 },
  { key: 'from1001To5000', max: 5000 },
  { key: 'over5000', max: Infinity },
] as const
const AMOUNT_RANGE_SHARE: Record<ReportGame, number[]> = {
  roulette: [0.38, 0.44, 0.12, 0.05, 0.01],
  pick3: [0.55, 0.38, 0.05, 0.02, 0],
  pick4: [0.5, 0.42, 0.06, 0.02, 0],
}

export function amountDistribution(period: ReportPeriod, filter: ReportGameFilter, now: Date): { key: (typeof AMOUNT_RANGES)[number]['key']; tickets: number }[] {
  const counts = AMOUNT_RANGES.map(() => 0)
  for (const game of gamesOf(filter)) {
    splitInteger(totalsFor(period, game, now).tickets, AMOUNT_RANGE_SHARE[game]).forEach((n, i) => (counts[i] += n))
  }
  return AMOUNT_RANGES.map((range, i) => ({ key: range.key, tickets: counts[i] }))
}

// ---------------------------------------------------------------------------------------------
// Juego: frecuencia de resultados y números más jugados.

export function rouletteFrequency(period: ReportPeriod, now: Date): { slot: string; count: number }[] {
  const counts = new Map(ROULETTE_SLOTS.map((slot) => [slot, 0]))
  for (const round of periodRounds(period, 'roulette', now)) counts.set(round.result, (counts.get(round.result) ?? 0) + 1)
  return ROULETTE_SLOTS.map((slot) => ({ slot, count: counts.get(slot) ?? 0 }))
}

export type RouletteGroupKey = 'zero' | 'doubleZero' | 'red' | 'black' | 'even' | 'odd' | 'dozen1' | 'dozen2' | 'dozen3' | 'low' | 'high'

// Resumen por color, paridad, docena y altura; 0 y 00 aparte (no son de ningún grupo).
export function rouletteGroupSummary(frequency: { slot: string; count: number }[]): { key: RouletteGroupKey; count: number; slots: number }[] {
  const groups: Record<RouletteGroupKey, { count: number; slots: number }> = {
    zero: { count: 0, slots: 1 },
    doubleZero: { count: 0, slots: 1 },
    red: { count: 0, slots: 18 },
    black: { count: 0, slots: 18 },
    even: { count: 0, slots: 18 },
    odd: { count: 0, slots: 18 },
    dozen1: { count: 0, slots: 12 },
    dozen2: { count: 0, slots: 12 },
    dozen3: { count: 0, slots: 12 },
    low: { count: 0, slots: 18 },
    high: { count: 0, slots: 18 },
  }
  for (const { slot, count } of frequency) {
    if (slot === '0') groups.zero.count += count
    else if (slot === '00') groups.doubleZero.count += count
    else {
      const n = Number(slot)
      groups[RED_NUMBERS.has(n) ? 'red' : 'black'].count += count
      groups[n % 2 === 0 ? 'even' : 'odd'].count += count
      groups[n <= 12 ? 'dozen1' : n <= 24 ? 'dozen2' : 'dozen3'].count += count
      groups[n <= 18 ? 'low' : 'high'].count += count
    }
  }
  return (Object.keys(groups) as RouletteGroupKey[]).map((key) => ({ key, ...groups[key] }))
}

// Veces que salió cada dígito (0–9) en cada posición: [posición][dígito].
export function digitFrequency(period: ReportPeriod, game: 'pick3' | 'pick4', now: Date): number[][] {
  const positions = game === 'pick3' ? 3 : 4
  const counts = Array.from({ length: positions }, () => Array(10).fill(0) as number[])
  for (const round of periodRounds(period, game, now)) {
    for (let p = 0; p < positions; p++) counts[p][Number(round.result[p])]++
  }
  return counts
}

// Los 20 números con más monto apostado.
export function topPlayedNumbers(period: ReportPeriod, game: 'pick3' | 'pick4', now: Date): { number: string; bets: number; amount: number }[] {
  const totals = totalsFor(period, game, now)
  const digits = game === 'pick3' ? 3 : 4
  const random = seededRandom(hashSeed(dayKey(period.start), dayKey(period.end), GAME_INDEX[game]))
  const seen = new Set<string>()
  const picks: { number: string; weight: number }[] = []
  while (picks.length < 20) {
    const number = Array.from({ length: digits }, () => Math.floor(random() * 10)).join('')
    if (seen.has(number)) continue
    seen.add(number)
    picks.push({ number, weight: 0.004 + random() * 0.012 })
  }
  return picks
    .map(({ number, weight }) => ({ number, bets: Math.round(totals.bets * weight), amount: totals.sales * weight }))
    .sort((a, b) => b.amount - a.amount)
}

// ---------------------------------------------------------------------------------------------
// Financiero.

// Días hasta la caducidad de un ticket premiado (supuesto del mock: no está definido en el backend).
export const TICKET_EXPIRY_DAYS = 30
const UNPAID_PROBABILITY = 0.06
const EXPIRED_PROBABILITY = 0.015

export interface PrizeTicket {
  code: string
  game: ReportGame
  machine: Machine
  roundId: string
  soldAt: Date
  prize: number
  expiresAt: Date
}

function pickMachine(seed: number): Machine {
  const active = MACHINES.filter((m) => m.weight > 0)
  const total = active.reduce((sum, m) => sum + m.weight, 0)
  let target = hashUnit(seed) * total
  for (const m of active) {
    target -= m.weight
    if (target <= 0) return m
  }
  return active[active.length - 1]
}

// Cache por día y juego: recorrer las rondas de 30 días (~100k) en cada render era lo más caro
// del Financiero (y pendingTickets/expiredTickets se piden desde la vista y desde
// financialByMachine).
const prizeTicketsCache = new Map<string, PrizeTicket[]>()

function dayPrizeTickets(day: Date, game: ReportGame, probability: number, salt: number, now: Date): PrizeTicket[] {
  const rounds = dayRounds(day, game, now)
  const cacheKey = `${dayKey(day)}-${game}-${salt}-${rounds.length}`
  const cached = prizeTicketsCache.get(cacheKey)
  if (cached) return cached
  const tickets: PrizeTicket[] = []
  for (const round of rounds) {
    if (round.prizes <= 0) continue
    const seed = hashSeed(dayKey(round.at), round.at.getHours() * 3600 + round.at.getMinutes() * 60 + round.at.getSeconds(), GAME_INDEX[game], salt)
    if (seed / 4294967296 >= probability) continue
    tickets.push({
      code: `${round.id.split('-')[0]}-${String(seed % 100000000).padStart(8, '0')}`,
      game,
      machine: pickMachine(seed),
      roundId: round.id,
      soldAt: round.at,
      // Un ticket de la ronda, no el total de premios de la ronda.
      prize: round2(round.prizes / Math.max(1, Math.round(round.tickets * 0.5))),
      expiresAt: addDays(startOfDay(round.at), TICKET_EXPIRY_DAYS),
    })
  }
  prizeTicketsCache.set(cacheKey, tickets)
  return tickets
}

function prizeTicketsBetween(from: Date, to: Date, filter: ReportGameFilter, probability: number, salt: number, now: Date): PrizeTicket[] {
  if (from > to) return []
  return periodDays({ start: from, end: to, partial: false }).flatMap((day) => gamesOf(filter).flatMap((game) => dayPrizeTickets(day, game, probability, salt, now)))
}

// Premios sin cobrar y sin vencer al cierre del período (sin importar cuándo se vendió el ticket).
export function pendingTickets(period: ReportPeriod, filter: ReportGameFilter, now: Date): PrizeTicket[] {
  return prizeTicketsBetween(addDays(period.end, -(TICKET_EXPIRY_DAYS - 1)), period.end, filter, UNPAID_PROBABILITY, 1, now).sort(
    (a, b) => a.expiresAt.getTime() - b.expiresAt.getTime(),
  )
}

// Premios que caducaron dentro del período sin cobrarse.
export function expiredTickets(period: ReportPeriod, filter: ReportGameFilter, now: Date): PrizeTicket[] {
  return prizeTicketsBetween(addDays(period.start, -TICKET_EXPIRY_DAYS), addDays(period.end, -TICKET_EXPIRY_DAYS), filter, EXPIRED_PROBABILITY, 2, now).sort(
    (a, b) => a.expiresAt.getTime() - b.expiresAt.getTime(),
  )
}

export interface FinancialRow {
  sales: number
  prizes: number
  paid: number
  pending: number
  expired: number
}

export const emptyFinancial = (): FinancialRow => ({ sales: 0, prizes: 0, paid: 0, pending: 0, expired: 0 })
export const cashNetOf = (row: FinancialRow) => row.sales - row.paid

export function addFinancial(target: FinancialRow, source: FinancialRow): FinancialRow {
  target.sales += source.sales
  target.prizes += source.prizes
  target.paid += source.paid
  target.pending += source.pending
  target.expired += source.expired
  return target
}

// Por máquina. Pagado: se asigna a la máquina donde se cobró (mock: ~90 % de los premios del
// período, con ruido por máquina). Pendiente/Vencido: suma de las listas de tickets.
export function financialByMachine(period: ReportPeriod, filter: ReportGameFilter, now: Date): Map<string, FinancialRow> {
  const rows = new Map(MACHINES.map((m) => [m.id, emptyFinancial()]))
  for (const activity of machineActivity(period, filter, now)) {
    const row = rows.get(activity.machine.id)!
    row.sales = activity.totals.sales
    row.prizes = activity.totals.prizes
    row.paid = activity.totals.prizes * (0.86 + hashUnit(dayKey(period.start), dayKey(period.end), Number(activity.machine.id.slice(1))) * 0.08)
  }
  for (const t of pendingTickets(period, filter, now)) rows.get(t.machine.id)!.pending += t.prize
  for (const t of expiredTickets(period, filter, now)) rows.get(t.machine.id)!.expired += t.prize
  return rows
}

export function financialByGame(period: ReportPeriod, now: Date): { game: ReportGame; row: FinancialRow }[] {
  return REPORT_GAMES.map((game) => {
    const row = emptyFinancial()
    for (const machineRow of financialByMachine(period, game, now).values()) addFinancial(row, machineRow)
    return { game, row }
  })
}

// ---------------------------------------------------------------------------------------------
// RTP: historial de cambios del objetivo de ruleta (RTP Management).

export interface RtpChange {
  at: Date
  user: string
  game: ReportGame
  from: number
  to: number
}

const RTP_TARGET_VALUES = [94.74, 94, 95, 93.5, 94.74, 95.5]
// Un cambio cada 9 días (mock), contados desde una fecha fija.
const RTP_CHANGE_EPOCH = new Date(2026, 0, 3)
const RTP_CHANGE_EVERY_DAYS = 9

function rtpChangeIndex(date: Date): number {
  return Math.floor((startOfDay(date).getTime() - RTP_CHANGE_EPOCH.getTime()) / 86_400_000 / RTP_CHANGE_EVERY_DAYS)
}

export function rouletteTargetAt(date: Date): number {
  return RTP_TARGET_VALUES[((rtpChangeIndex(date) % RTP_TARGET_VALUES.length) + RTP_TARGET_VALUES.length) % RTP_TARGET_VALUES.length]
}

export function rtpChanges(period: ReportPeriod): RtpChange[] {
  const changes: RtpChange[] = []
  for (const day of periodDays(period)) {
    if (rtpChangeIndex(day) === rtpChangeIndex(addDays(day, -1))) continue
    const index = rtpChangeIndex(day)
    changes.push({
      at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9 + (index % 8), (index * 17) % 60),
      user: OPERATOR_NAMES[Math.abs(index) % OPERATOR_NAMES.length],
      game: 'roulette',
      from: rouletteTargetAt(addDays(day, -1)),
      to: rouletteTargetAt(day),
    })
  }
  return changes
}
