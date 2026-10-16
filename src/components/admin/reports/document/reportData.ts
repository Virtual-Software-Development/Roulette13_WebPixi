import { REPORT_GAMES, gamesOf } from '../../../../api/adminReports'
import type {
  ManualSubstitutionsDay,
  ManualSubstitutionsOperatorRow,
  ManualSubstitutionsReportData,
  ManualSubstitutionsTotals,
  ReportActivity,
  ReportBetType,
  ReportGame,
  ReportGameFilter,
  ReportMachine,
  ReportMachinesData,
  ReportRtpData,
  ReportSubstitution,
  ReportTotals,
} from '../../../../types/adminReports'
import { formatDayMonth } from '../../../../utils/reportFormat'
import { periodDays, toIsoDate, type ReportPeriod } from '../../../../utils/reportPeriod'

// Agregados de los datos del backend (api/adminReports.ts) que usan la pantalla y los documentos.
// Funciones puras: el mismo dato da las mismas cifras en pantalla y en los tres formatos de archivo.

export type Totals = ReportTotals

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

export function totalsFor(activity: ReportActivity, filter: ReportGameFilter): Totals {
  const games = gamesOf(filter)
  return activity.days.filter((d) => games.includes(d.game)).reduce(addTotals, emptyTotals())
}

// Un punto por día del período (los días sin rondas en cero).
export function totalsByDay(activity: ReportActivity, period: ReportPeriod, filter: ReportGameFilter): { date: Date; totals: Totals }[] {
  const games = gamesOf(filter)
  const byDate = new Map<string, Totals>()
  for (const day of activity.days) {
    if (!games.includes(day.game)) continue
    byDate.set(day.date, addTotals(byDate.get(day.date) ?? emptyTotals(), day))
  }
  return periodDays(period).map((date) => ({ date, totals: byDate.get(toIsoDate(date)) ?? emptyTotals() }))
}

export function totalsByGame(activity: ReportActivity): { game: ReportGame; totals: Totals }[] {
  return REPORT_GAMES.map((game) => ({ game, totals: totalsFor(activity, game) }))
}

export function hourlyActivity(activity: ReportActivity, filter: ReportGameFilter): { hour: number; tickets: number; sales: number }[] {
  const games = gamesOf(filter)
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, tickets: 0, sales: 0 }))
  for (const h of activity.hours) {
    if (!games.includes(h.game) || !hours[h.hour]) continue
    hours[h.hour].tickets += h.tickets
    hours[h.hour].sales += h.sales
  }
  return hours
}

// Peak Hours: ventas y tickets por día de la semana (0 = lunes) y hora, sumando todo el período.
export function weekdayHourActivity(activity: ReportActivity, filter: ReportGameFilter): { sales: number[][]; tickets: number[][] } {
  const games = gamesOf(filter)
  const grid = () => Array.from({ length: 7 }, () => Array<number>(24).fill(0))
  const sales = grid()
  const tickets = grid()
  for (const h of activity.hours) {
    if (!games.includes(h.game) || !sales[h.weekday] || h.hour < 0 || h.hour > 23) continue
    sales[h.weekday][h.hour] += h.sales
    tickets[h.weekday][h.hour] += h.tickets
  }
  return { sales, tickets }
}

// ---------------------------------------------------------------------------------------------
// Juego.

export const ROULETTE_SLOTS = ['0', '00', ...Array.from({ length: 36 }, (_, i) => String(i + 1))]
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

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

// Clave de admin.reports.views.betTypes de un tipo de apuesta del backend (bet_type.code_name).
// Ruleta usa las claves en español ya existentes; straight de Quick Money se separa por dígitos.
const ROULETTE_BET_TYPE_KEYS: Record<string, string> = {
  straight: 'pleno',
  split: 'caballo',
  street: 'calle',
  corner: 'esquina',
  basket: 'cesta',
  six_line: 'linea',
  column: 'columna',
  dozen: 'docena',
  red_black: 'color',
  even_odd: 'paridad',
  low_high: 'altura',
}

export function betTypeKey(game: ReportGame, code: string, digits: number | null): string {
  if (game === 'roulette') return ROULETTE_BET_TYPE_KEYS[code] ?? code
  return code === 'straight' ? `straight${digits ?? ''}` : code
}

export const betTypesOf = (rows: ReportBetType[], game: ReportGame) => rows.filter((r) => r.game === game)

// ---------------------------------------------------------------------------------------------
// Máquinas: actividad de venta y cuadre financiero.

// Rangos de monto por ticket (mismo orden que los del backend).
export const AMOUNT_RANGES = ['upTo100', 'from101To500', 'from501To1000', 'from1001To5000', 'over5000'] as const

export function amountDistribution(data: ReportMachinesData, filter: ReportGameFilter): { key: (typeof AMOUNT_RANGES)[number]; tickets: number }[] {
  const games = gamesOf(filter)
  const counts = AMOUNT_RANGES.map(() => 0)
  for (const range of data.amountRanges) {
    if (games.includes(range.game) && range.index >= 0 && range.index < counts.length) counts[range.index] += range.tickets
  }
  return AMOUNT_RANGES.map((key, i) => ({ key, tickets: counts[i] }))
}

export interface MachineActivity {
  machine: ReportMachine
  tickets: number
  sales: number
  salesByGame: Record<ReportGame, number>
  lastSaleAt: Date | null
}

export function machineActivity(data: ReportMachinesData, filter: ReportGameFilter): MachineActivity[] {
  const games = gamesOf(filter)
  const rows = new Map(
    data.machines.map((machine) => [machine.id, { machine, tickets: 0, sales: 0, salesByGame: { roulette: 0, quickMoney: 0 }, lastSaleAt: null } as MachineActivity]),
  )
  for (const cell of data.totals) {
    const row = rows.get(cell.machineId)
    if (!row || !games.includes(cell.game)) continue
    row.tickets += cell.tickets
    row.sales += cell.sales
    row.salesByGame[cell.game] += cell.sales
    if (cell.lastSaleAt && (!row.lastSaleAt || cell.lastSaleAt > row.lastSaleAt)) row.lastSaleAt = cell.lastSaleAt
  }
  return [...rows.values()]
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

// Por máquina (todas las del catálogo, en cero si no tuvieron movimiento). Pagado = cobrado en esa
// máquina; pendiente/vencido = premios de los tickets que vendió.
export function financialByMachine(data: ReportMachinesData, filter: ReportGameFilter): Map<string, FinancialRow> {
  const games = gamesOf(filter)
  const rows = new Map(data.machines.map((m) => [m.id, emptyFinancial()]))
  for (const cell of data.totals) {
    if (!games.includes(cell.game)) continue
    const row = rows.get(cell.machineId)
    if (row) addFinancial(row, { sales: cell.sales, prizes: cell.prizes, paid: cell.paid, pending: cell.pending, expired: cell.expired })
  }
  return rows
}

export function financialByGame(data: ReportMachinesData): { game: ReportGame; row: FinancialRow }[] {
  return REPORT_GAMES.map((game) => {
    const row = emptyFinancial()
    for (const machineRow of financialByMachine(data, game).values()) addFinancial(row, machineRow)
    return { game, row }
  })
}

// Bancas del catálogo (con su consorcio) en el orden en que llegan las máquinas.
export function bancasOf(machines: ReportMachine[]): { banca: ReportMachine['banca']; consorcio: ReportMachine['consorcio']; machines: ReportMachine[] }[] {
  const out = new Map<string, { banca: ReportMachine['banca']; consorcio: ReportMachine['consorcio']; machines: ReportMachine[] }>()
  for (const machine of machines) {
    const entry = out.get(machine.banca.id) ?? { banca: machine.banca, consorcio: machine.consorcio, machines: [] }
    entry.machines.push(machine)
    out.set(machine.banca.id, entry)
  }
  return [...out.values()]
}

// ---------------------------------------------------------------------------------------------
// RTP.

// Objetivo de cada día del período (null si el backend no lo mandó).
export function dailyTargets(rtp: ReportRtpData, period: ReportPeriod, game: ReportGame): (number | null)[] {
  const byDate = new Map(rtp.targets.filter((t) => t.game === game).map((t) => [t.date, t.target]))
  return periodDays(period).map((date) => byDate.get(toIsoDate(date)) ?? null)
}

// Objetivo del período: promedio de los objetivos diarios ponderado por rondas (sin rondas, el del
// último día).
export function periodTarget(rtp: ReportRtpData, activity: ReportActivity, period: ReportPeriod, game: ReportGame): number | null {
  const targets = dailyTargets(rtp, period, game)
  const rounds = totalsByDay(activity, period, game).map((d) => d.totals.rounds)
  let weight = 0
  let sum = 0
  targets.forEach((target, i) => {
    if (target === null || rounds[i] === 0) return
    weight += rounds[i]
    sum += target * rounds[i]
  })
  return weight > 0 ? sum / weight : (targets[targets.length - 1] ?? null)
}

export const rtpSettingsOf = (rtp: ReportRtpData, game: ReportGame) => rtp.games.find((g) => g.game === game) ?? null

// ---------------------------------------------------------------------------------------------
// Sustituciones manuales.

// Puntos porcentuales que movió el RTP un cambio de pago sobre lo apostado.
const impactPp = (deltaPaid: number, sales: number) => (sales > 0 ? (deltaPaid / sales) * 100 : 0)

function toTotals(events: number, annulments: number, rtpImpactPp: number): ManualSubstitutionsTotals {
  return { events, annulments, annulmentRate: events > 0 ? (annulments / events) * 100 : 0, rtpImpactPp }
}

// Días, operadores y totales de un período. El impacto en RTP de una sustitución es lo que pagan
// sus apuestas con el resultado nuevo menos lo que habrían pagado con el anterior, sobre lo
// apostado: por día sobre lo del día, el acumulado y los operadores sobre lo del período.
function summarizeSubstitutions(activity: ReportActivity, period: ReportPeriod, filter: ReportGameFilter, substitutions: ReportSubstitution[]) {
  const games = gamesOf(filter)
  const items = substitutions.filter((s) => games.includes(s.game))
  const byDay = totalsByDay(activity, period, filter)
  const periodSales = byDay.reduce((sum, d) => sum + d.totals.sales, 0)
  let cumulativeDelta = 0
  let cumulativeSales = 0

  const days: ManualSubstitutionsDay[] = byDay.map(({ date, totals }) => {
    const key = toIsoDate(date)
    const own = items.filter((s) => toIsoDate(s.roundAt) === key)
    const delta = own.reduce((sum, s) => sum + s.paidNew - s.paidOriginal, 0)
    cumulativeDelta += delta
    cumulativeSales += totals.sales
    return {
      label: formatDayMonth(date),
      events: totals.rounds,
      annulments: own.length,
      rtpImpactPp: impactPp(delta, totals.sales),
      cumulativeRtpImpactPp: impactPp(cumulativeDelta, cumulativeSales),
    }
  })

  const totals = toTotals(
    days.reduce((sum, d) => sum + d.events, 0),
    items.length,
    impactPp(cumulativeDelta, periodSales),
  )

  const byOperator = new Map<string, { user: ReportSubstitution['user']; annulments: number; delta: number; lastAt: Date | null }>()
  for (const s of items) {
    const id = s.user?.username ?? ''
    const row = byOperator.get(id) ?? { user: s.user, annulments: 0, delta: 0, lastAt: null }
    row.annulments += 1
    row.delta += s.paidNew - s.paidOriginal
    if (!row.lastAt || s.at > row.lastAt) row.lastAt = s.at
    byOperator.set(id, row)
  }
  const operators: ManualSubstitutionsOperatorRow[] = [...byOperator.entries()]
    .map(([id, row]) => ({
      id: id || 'no-session',
      fullName: row.user ? row.user.fullName || row.user.username : null,
      username: row.user?.username ?? null,
      annulments: row.annulments,
      shareOfAnnulments: items.length > 0 ? (row.annulments / items.length) * 100 : 0,
      rtpImpactPp: impactPp(row.delta, periodSales),
      lastSubstitutionAt: row.lastAt,
    }))
    .sort((a, b) => b.annulments - a.annulments)

  return { days, operators, totals }
}

export interface SubstitutionsInput {
  period: ReportPeriod
  previousPeriod: ReportPeriod
  filter: ReportGameFilter
  activity: ReportActivity
  substitutions: ReportSubstitution[]
  previousActivity: ReportActivity
  previousSubstitutions: ReportSubstitution[]
}

export function buildManualSubstitutionsReport(input: SubstitutionsInput): ManualSubstitutionsReportData {
  const current = summarizeSubstitutions(input.activity, input.period, input.filter, input.substitutions)
  const previous = summarizeSubstitutions(input.previousActivity, input.previousPeriod, input.filter, input.previousSubstitutions)
  return { ...current, previousTotals: previous.totals }
}
