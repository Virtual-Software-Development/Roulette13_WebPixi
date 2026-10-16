import type { TFunction } from 'i18next'
import type { ReportData, ReportGame, ReportGameFilter } from '../../../../types/adminReports'
import { formatPoints, formatVariation } from '../../../../utils/reportFormat'
import type { ReportPeriod, ReportPeriodKind } from '../../../../utils/reportPeriod'
import { avgTicketOf, balanceOf, rtpOf, type Totals } from './reportData'
import { column, type DocBlock, type DocCell, type DocColumn, type DocRow, type DocStat, type ValueFormat } from './reportDocument'

export interface BuildContext {
  t: TFunction
  // Locale de Intl para nombres de días (es-DO / en-US).
  locale: string
  period: ReportPeriod
  kind: ReportPeriodKind
  game: ReportGameFilter
  now: Date
  // Archivo de "Todos los juegos" con una sección por juego (ver buildReportDocument.byGameBlocks):
  // el detalle de cada juego ya viene debajo, sin "elige un juego para ver…".
  byGame?: boolean
  // Lo que se pidió al backend para este reporte (api/adminReports.ts > fetchReportData).
  data: ReportData
}

export interface DocumentBody {
  blocks: DocBlock[]
  previousLabel?: string
}

// Paleta categórica validada (dataviz validate_palette) contra el fondo oscuro del Admin y contra el
// blanco del PDF: Venta / Premios / Balance siempre con el mismo color en todos los reportes.
export const SERIES_COLORS = { sales: '#2588ff', prizes: '#c98420', balance: '#199e70', previous: '#6b7d90', rtp: '#f32635' }

export const gameLabel = (t: TFunction, game: ReportGame | ReportGameFilter) => t(`admin.reports.filters.gameOptions.${game}`)

// "Rondas" en ruleta, "Sorteos" en Quick Money, "Rondas/Sorteos" con todos los juegos.
export function roundsLabel(t: TFunction, game: ReportGameFilter): string {
  if (game === 'all') return t('admin.reports.views.kpi.roundsOrDraws')
  return t(game === 'roulette' ? 'admin.reports.views.kpi.rounds' : 'admin.reports.views.kpi.draws')
}

// Valor con "anterior · variación %" si hay período de comparación.
export function compareCell(current: number, previous: number | undefined): number | DocCell {
  return previous === undefined ? current : { value: current, previous, change: formatVariation(current, previous) }
}

// RTP: la variación va en puntos porcentuales.
export function rtpCompareCell(totals: Totals, previous?: Totals): number | null | DocCell {
  const rtp = rtpOf(totals)
  if (!previous) return rtp
  const prev = rtpOf(previous)
  return { value: rtp, previous: prev, change: rtp !== null && prev !== null ? formatPoints(rtp - prev) : '—' }
}

// Columnas Rondas/Sorteos · Tickets · Venta · Premios · Balance · RTP (tablas por día, juego, semana).
export function totalsColumns(t: TFunction, firstHeader: string, game: ReportGameFilter): DocColumn[] {
  return [
    column('label', firstHeader, 'text'),
    column('rounds', roundsLabel(t, game), 'count'),
    column('tickets', t('admin.reports.views.kpi.tickets'), 'count'),
    column('sales', t('admin.reports.views.kpi.sales'), 'currency'),
    column('prizes', t('admin.reports.views.kpi.prizes'), 'currency'),
    column('balance', t('admin.reports.views.kpi.balance'), 'currency'),
    column('rtp', t('admin.reports.views.kpi.rtp'), 'percent'),
  ]
}

export function totalsRow(key: string, label: string, totals: Totals, previous?: Totals, kind?: 'subtotal'): DocRow {
  return {
    key,
    kind,
    cells: {
      label,
      rounds: compareCell(totals.rounds, previous?.rounds),
      tickets: compareCell(totals.tickets, previous?.tickets),
      sales: compareCell(totals.sales, previous?.sales),
      prizes: compareCell(totals.prizes, previous?.prizes),
      balance: compareCell(balanceOf(totals), previous && balanceOf(previous)),
      rtp: rtpCompareCell(totals, previous),
    },
  }
}

export function stat(key: string, label: string, value: number | null, format: ValueFormat, previous?: number | null): DocStat {
  if (previous === undefined) return { key, label, value, format }
  // Porcentajes y puntos varían en puntos porcentuales; el resto, en % sobre el anterior.
  const change = value === null || previous === null ? '—' : format === 'percent' || format === 'points' ? formatPoints(value - previous) : formatVariation(value, previous)
  return { key, label, value, format, previous, change }
}

// Indicadores comunes de Resumen/Semanal/Mensual.
export function totalsStats(t: TFunction, totals: Totals, game: ReportGameFilter, previous?: Totals): DocStat[] {
  const kpi = (key: string) => t(`admin.reports.views.kpi.${key}`)
  const stats: DocStat[] = [
    stat('sales', kpi('sales'), totals.sales, 'currency', previous?.sales),
    stat('prizes', kpi('prizes'), totals.prizes, 'currency', previous?.prizes),
    stat('balance', kpi('balance'), balanceOf(totals), 'currency', previous && balanceOf(previous)),
    stat('rtp', kpi('rtp'), rtpOf(totals), 'percent', previous && rtpOf(previous)),
    stat('tickets', kpi('tickets'), totals.tickets, 'count', previous?.tickets),
    stat('avgTicket', kpi('avgTicket'), avgTicketOf(totals), 'currency', previous && avgTicketOf(previous)),
  ]
  if (game !== 'all') stats.push(stat('rounds', roundsLabel(t, game), totals.rounds, 'count', previous?.rounds))
  return stats
}
