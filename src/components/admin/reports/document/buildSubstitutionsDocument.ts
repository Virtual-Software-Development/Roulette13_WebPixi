import type { ManualSubstitutionsReportData } from '../../../../types/adminReports'
import { SERIES_COLORS, stat, type BuildContext, type DocumentBody } from './documentHelpers'
import { column, type DocBlock, type DocPanel, type DocRow } from './reportDocument'

// Sustituciones manuales (solo ruleta), para los archivos: KPIs con el período anterior, las dos
// gráficas, el desglose por operador y el detalle por día.
export function buildSubstitutionsDocument({ t }: BuildContext, data: ManualSubstitutionsReportData): DocumentBody {
  const { totals, previousTotals, days, operators } = data
  const s = (key: string) => t(`admin.reports.substitutions.${key}`)

  const operatorRow = (key: string, cells: DocRow['cells']): DocRow => ({ key, cells })
  const rateOf = (events: number, annulments: number) => (events > 0 ? (annulments / events) * 100 : 0)

  const perDayPanel: DocPanel = {
    type: 'panel',
    key: 'perDay',
    title: s('perDay.title'),
    subtitle: s('perDay.subtitle'),
    content: [
      {
        type: 'barChart',
        categoryLabel: s('date'),
        categories: days.map((d) => d.label),
        series: [{ key: 'annulments', label: s('perDay.annulments'), color: SERIES_COLORS.sales, values: days.map((d) => d.annulments) }],
        valueFormat: 'count',
        height: 260,
      },
    ],
  }
  const impactPanel: DocPanel = {
    type: 'panel',
    key: 'impact',
    title: s('impact.title'),
    subtitle: s('impact.subtitle'),
    content: [
      {
        type: 'lineChart',
        categoryLabel: s('date'),
        categories: days.map((d) => d.label),
        series: [{ key: 'cumulative', label: s('impact.cumulative'), color: SERIES_COLORS.rtp, values: days.map((d) => d.cumulativeRtpImpactPp) }],
        valueFormat: 'points',
        axisFormat: 'pointsAxis',
        height: 260,
      },
    ],
  }
  const operatorsPanel: DocPanel = {
    type: 'panel',
    key: 'operators',
    title: s('operators.title'),
    content: [
      {
        type: 'table',
        columns: [
          column('operator', s('operators.operator'), 'text'),
          column('annulments', s('operators.annulments'), 'count'),
          column('share', s('operators.share'), 'percent1'),
          column('rtpImpact', s('operators.rtpImpact'), 'points'),
          column('last', s('operators.lastSubstitution'), 'dateTime', 'right'),
        ],
        rows: operators.map((o) =>
          operatorRow(o.id, {
            operator: o.fullName ? `${o.fullName} (@${o.username})` : s('operators.noSession'),
            annulments: o.annulments,
            share: o.shareOfAnnulments,
            rtpImpact: o.rtpImpactPp,
            last: o.lastSubstitutionAt,
          }),
        ),
        footer: operators.length > 0 ? [operatorRow('total', { operator: s('operators.total'), annulments: totals.annulments, share: 100, rtpImpact: totals.rtpImpactPp, last: '' })] : undefined,
        emptyText: s('operators.empty'),
      },
    ],
  }
  const byDayPanel: DocPanel = {
    type: 'panel',
    key: 'byDay',
    title: t('admin.reports.views.summary.byDay'),
    content: [
      {
        type: 'table',
        columns: [
          column('date', s('date'), 'text'),
          column('events', s('perDay.events'), 'count'),
          column('annulments', s('perDay.annulments'), 'count'),
          column('rate', s('perDay.rate'), 'percent'),
          column('daily', s('impact.daily'), 'points'),
          column('cumulative', s('impact.cumulative'), 'points'),
        ],
        rows: days.map((d) => ({
          key: d.label,
          cells: { date: d.label, events: d.events, annulments: d.annulments, rate: rateOf(d.events, d.annulments), daily: d.rtpImpactPp, cumulative: d.cumulativeRtpImpactPp },
        })),
        footer: [
          {
            key: 'total',
            cells: { date: t('admin.reports.views.common.total'), events: totals.events, annulments: totals.annulments, rate: totals.annulmentRate, daily: totals.rtpImpactPp, cumulative: '' },
          },
        ],
      },
    ],
  }

  const stats: DocBlock = {
    type: 'stats',
    stats: [
      stat('events', s('kpi.totalEvents'), totals.events, 'count', previousTotals.events),
      stat('annulments', s('kpi.annulments'), totals.annulments, 'count', previousTotals.annulments),
      stat('annulmentRate', s('kpi.annulmentRate'), totals.annulmentRate, 'percent', previousTotals.annulmentRate),
      stat('rtpImpact', s('kpi.rtpImpact'), totals.rtpImpactPp, 'points', previousTotals.rtpImpactPp),
    ],
  }
  return {
    previousLabel: t('admin.reports.document.previousPeriod'),
    blocks: [stats, { type: 'row', panels: [perDayPanel, impactPanel] }, operatorsPanel, byDayPanel],
  }
}
