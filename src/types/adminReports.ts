export type ReportMetricAccent = 'green' | 'blue' | 'purple' | 'red'
export type ReportMetricIcon = 'bets' | 'payout' | 'revenue' | 'rtp' | 'substitutions' | 'rate'

export interface ReportKpiCardData {
  id: string
  titleKey: string
  value: string
  icon: ReportMetricIcon
  accent: ReportMetricAccent
  // Opcionales: sin período anterior con datos la fila de trend se omite (nunca un número inventado).
  trend?: string
  // 'positive' pinta el trend en verde y 'negative' en rojo (Total Bets/Payout/Revenue); 'accent' lo
  // pinta con el mismo color que la card (RTP, cuya variación en pp la referencia distingue en rojo
  // aunque sea positiva).
  trendTone?: 'positive' | 'negative' | 'accent'
  trendLabelKey?: string
}

export type ReportGame = 'roulette' | 'quickMoney'

// "salesActivity" = Actividad por punto de venta (antes "Reporte de Jugadores": no hay registro de
// jugadores todavía; cuando exista, el Reporte de Jugadores será un tipo nuevo).
export type ReportType =
  | 'summary'
  | 'gameReport'
  | 'salesActivity'
  | 'financialReport'
  | 'rtpAnalysis'
  | 'weeklyReport'
  | 'monthlyReport'
  | 'manualSubstitutions'

export interface ReportShortcutData {
  id: ReportType
  icon: string
  titleKey: string
  descriptionKey: string
}

export type ReportGameFilter = 'all' | ReportGame

// Gráficas de la pantalla de Reportes (un punto por día del período).
export interface BetsPayoutsPoint {
  label: string
  // Monto apostado (ventas) y premios del día, en la moneda de Reportes.
  bets: number
  payout: number
}

export interface ReportRtpTrendPoint {
  label: string
  // null = día sin ventas (sin RTP); target null = el juego no tiene objetivo configurado.
  rtp: number | null
  target: number | null
}

export interface GamePerformanceRow {
  id: ReportGame
  // Cantidad de apuestas; premios y ganancia bruta (ventas − premios) en la moneda de Reportes.
  totalBets: number
  totalPayout: number
  grossRevenue: number
  rtp: number | null
}

export type RecentReportFormat = 'csv' | 'pdf' | 'excel'

export interface RecentReportRow {
  id: string
  name: string
  type: ReportType
  dateRangeLabel: string
  generatedBy: string
  createdAt: string
  // Período (yyyy-mm-dd) y juego con los que se generó: al descargar desde Recent Reports se vuelven
  // a pedir los datos y se arma el mismo documento (el archivo no se guarda en el backend).
  period: { start: string; end: string }
  game: ReportGameFilter
}

// Manual Substitutions -- una fila por día del período, a partir de result_override.
// "Eventos" = rondas sorteadas (COMPLETED) de los juegos elegidos; "anulación" = cambio manual del
// resultado en Next Results (la sustitución anula el resultado sugerido).
export interface ManualSubstitutionsDay {
  label: string
  events: number
  annulments: number
  // Puntos porcentuales que movieron el RTP las anulaciones del día (negativo = el RTP bajó
  // respecto de lo que habría dejado el resultado del sistema).
  rtpImpactPp: number
  cumulativeRtpImpactPp: number
}

export interface ManualSubstitutionsTotals {
  events: number
  annulments: number
  // annulments / events, en %.
  annulmentRate: number
  rtpImpactPp: number
}

export interface ManualSubstitutionsOperatorRow {
  id: string
  // null = sustitución hecha sin sesión (la ruta del backend acepta llamadas sin token y la deja
  // sin autor).
  fullName: string | null
  username: string | null
  annulments: number
  // Parte de las anulaciones del período que hizo este operador, en %.
  shareOfAnnulments: number
  rtpImpactPp: number
  lastSubstitutionAt: Date | null
}

export interface ManualSubstitutionsReportData {
  days: ManualSubstitutionsDay[]
  operators: ManualSubstitutionsOperatorRow[]
  totals: ManualSubstitutionsTotals
  previousTotals: ManualSubstitutionsTotals
}

// ---------------------------------------------------------------------------------------------
// Datos de los reportes (quick-money-backend, internal/reports). Solo rondas COMPLETED aportan
// tickets, apuestas o montos. Montos en la moneda de Reportes; fechas como Date en hora de pared de
// Santo Domingo (ver reportFormat.ts); días como yyyy-mm-dd.

export interface ReportTotals {
  rounds: number
  tickets: number
  bets: number
  // Monto apostado y pagado a ganadores (apuesta + premio).
  sales: number
  prizes: number
}

export interface ReportDayTotals extends ReportTotals {
  date: string
  game: ReportGame
}

export interface ReportHourTotals {
  // 0 = lunes … 6 = domingo.
  weekday: number
  hour: number
  game: ReportGame
  tickets: number
  sales: number
}

export interface ReportActivity {
  days: ReportDayTotals[]
  hours: ReportHourTotals[]
}

export interface ReportBetType {
  game: ReportGame
  // bet_type.code_name; digits = números cubiertos (en Quick Money separa straight de 3 y de 4).
  code: string
  digits: number | null
  name: string
  bets: number
  amount: number
  prizes: number
  // Solo ruleta (casillas × (pago + 1) ÷ 38).
  theoreticalRtp: number | null
}

export interface ReportPlayedNumber {
  number: string
  betTypes: string[]
  bets: number
  amount: number
}

export interface ReportGameData {
  betTypes: ReportBetType[]
  rouletteRounds: number
  // Casillas en orden 0, 00, 1..36.
  rouletteFrequency: { slot: string; count: number }[]
  // [posición][dígito] de los sorteos de Quick Money.
  digits: { draws: number; pick3: number[][]; pick4: number[][] }
  topNumbers: ReportPlayedNumber[]
}

export interface ReportRound {
  id: string
  code: string
  at: Date
  // Ruleta "17"; Quick Money "472 · 1905".
  result: string
  manual: boolean
  // Quien hizo el último cambio manual (null = automático o sin sesión).
  user: string | null
  tickets: number
  bets: number
  amount: number
  prizes: number
}

export interface ReportRounds {
  // Más nuevas primero.
  items: ReportRound[]
  truncated: boolean
}

export interface ReportOrganization {
  id: string
  name: string
}

export interface ReportMachine {
  id: string
  name: string
  isActive: boolean
  banca: ReportOrganization
  consorcio: ReportOrganization
}

export interface ReportMachineTotals {
  machineId: string
  game: ReportGame
  // Venta de la máquina en rondas del período.
  tickets: number
  sales: number
  prizes: number
  lastSaleAt: Date | null
  // Premios cobrados en la máquina dentro del período; pendientes al cierre y vencidos en el
  // período de los tickets vendidos ahí.
  paid: number
  pending: number
  expired: number
}

export interface ReportMachinesData {
  machines: ReportMachine[]
  totals: ReportMachineTotals[]
  // Tickets por rango de monto: índice de AMOUNT_RANGES.
  amountRanges: { game: ReportGame; index: number; tickets: number }[]
}

export interface ReportPrizeTicket {
  // Enmascarado (el código completo alcanza para cobrar).
  code: string
  game: ReportGame
  machineId: string
  round: string
  soldAt: Date
  prize: number
  expiresAt: Date
}

export interface ReportPrizeList {
  count: number
  amount: number
  items: ReportPrizeTicket[]
  truncated: boolean
}

export interface ReportUnpaidPrizes {
  // Cierre del período (o ahora, si no terminó).
  cutoff: Date
  pending: ReportPrizeList
  expired: ReportPrizeList
}

export interface ReportRtpGame {
  game: ReportGame
  target: number
  minBand: number
  maxBand: number
}

export interface ReportRtpChange {
  at: Date
  game: ReportGame
  user: string | null
  from: number
  to: number
}

export interface ReportRtpData {
  games: ReportRtpGame[]
  // Objetivo de cada día y juego.
  targets: { date: string; game: ReportGame; target: number }[]
  changes: ReportRtpChange[]
}

export interface ReportSubstitution {
  round: string
  game: ReportGame
  // Sorteo de la ronda (define su día) y momento del cambio.
  roundAt: Date
  at: Date
  user: { username: string; fullName: string } | null
  originalResult: string
  newResult: string
  reason: string
  // Lo que habrían pagado las apuestas de la ronda con cada resultado.
  paidOriginal: number
  paidNew: number
}

// Lo que un reporte pidió al backend; cada documento usa las partes que necesita.
export interface ReportData {
  activity: ReportActivity
  // Período de comparación (Semanal/Mensual, Sustituciones).
  previousActivity?: ReportActivity
  game?: ReportGameData
  rounds?: Partial<Record<ReportGame, ReportRounds>>
  machines?: ReportMachinesData
  unpaidPrizes?: ReportUnpaidPrizes
  rtp?: ReportRtpData
  substitutions?: ReportSubstitution[]
  previousSubstitutions?: ReportSubstitution[]
}
