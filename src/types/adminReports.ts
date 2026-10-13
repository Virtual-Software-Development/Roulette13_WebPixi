export type ReportMetricAccent = 'green' | 'blue' | 'purple' | 'red'
export type ReportMetricIcon = 'bets' | 'payout' | 'revenue' | 'rtp' | 'substitutions' | 'rate'

export interface ReportKpiCardData {
  id: string
  titleKey: string
  value: string
  icon: ReportMetricIcon
  accent: ReportMetricAccent
  trend: string
  // 'positive' pinta el trend en verde (Total Bets/Payout/Revenue); 'accent' lo pinta con el mismo
  // color que la card (RTP, cuya variación en pp la referencia distingue en rojo aunque sea positiva).
  trendTone: 'positive' | 'accent'
  trendLabelKey: string
}

export type ReportGame = 'roulette' | 'pick3' | 'pick4'

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
  // Período (yyyy-mm-dd) y juego con los que se generó: al descargar desde Recent Reports se vuelve
  // a armar el mismo documento (no hay backend que guarde el archivo todavía).
  period: { start: string; end: string }
  game: ReportGameFilter
}

// Manual Substitutions -- una fila por día del período, a partir del log de auditoría
// (system_events con event_type 'manual_result'). Solo ruleta admite sustitución manual.
// "Eventos" = rondas de ruleta jugadas; "anulación" = ronda cuyo resultado del sistema se cambió
// a mano en Next Results (la sustitución anula el resultado sugerido).
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
