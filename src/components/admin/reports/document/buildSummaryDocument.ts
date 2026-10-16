import { formatDate, formatDayMonth } from '../../../../utils/reportFormat'
import { comparisonPeriod } from '../../../../utils/reportPeriod'
import { SERIES_COLORS, gameLabel, totalsColumns, totalsRow, totalsStats, type BuildContext, type DocumentBody } from './documentHelpers'
import { addTotals, balanceOf, emptyTotals, totalsByDay, totalsByGame, totalsFor, type Totals } from './reportData'
import type { DocBlock, DocChart, DocRow, DocTable } from './reportDocument'

// Resumen, Semanal y Mensual son el mismo reporte (docs: "Resumen de la propuesta"): cambian el
// período y, en Semanal/Mensual, la comparación con el período anterior.
// - Resumen: rango libre, sin comparación.
// - Semanal: semana lun–dom; comparación con la anterior; gráfica semana actual vs anterior.
// - Mensual: mes; comparación con el anterior; tabla por día dividida por semana, con subtotales.
export function buildSummaryDocument({ t, locale, period, kind, game, data }: BuildContext): DocumentBody {
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  const compare = kind === 'range' ? null : comparisonPeriod(period, kind)
  const previousActivity = data.previousActivity ?? { days: [], hours: [] }
  const totals = totalsFor(data.activity, game)
  const previous = compare ? totalsFor(previousActivity, game) : undefined
  const days = totalsByDay(data.activity, period, game)
  const previousDays = compare ? totalsByDay(previousActivity, compare, game) : []

  const previousLabel = kind === 'week' ? t('admin.reports.views.summary.previousWeek') : kind === 'month' ? t('admin.reports.views.summary.previousMonth') : undefined
  const dayLabel = (date: Date) => `${weekdayFormatter.format(date)} ${formatDate(date)}`
  const totalLabel = t('admin.reports.views.common.total')
  const multiDay = days.length > 1
  const blocks: DocBlock[] = []

  if (period.partial && kind !== 'range') {
    blocks.push({ type: 'note', text: t(kind === 'week' ? 'admin.reports.views.summary.partialWeekNote' : 'admin.reports.views.summary.partialMonthNote') })
  }
  blocks.push({ type: 'stats', stats: totalsStats(t, totals, game, previous) })

  // La vista resumida no muestra gráficas de barras.
  if (multiDay) {
    const chart: DocChart =
      kind === 'week'
        ? {
            type: 'barChart',
            categoryLabel: t('admin.reports.views.columns.date'),
            categories: days.map(({ date }) => weekdayFormatter.format(date)),
            tooltipTitles: days.map(({ date }) => dayLabel(date)),
            series: [
              { key: 'current', label: t('admin.reports.views.summary.currentWeek'), color: SERIES_COLORS.sales, values: days.map((d) => d.totals.sales) },
              { key: 'previous', label: previousLabel!, color: SERIES_COLORS.previous, values: previousDays.map((d) => d.totals.sales) },
            ],
            valueFormat: 'currency',
            axisFormat: 'compactCurrency',
          }
        : {
            type: 'barChart',
            categoryLabel: t('admin.reports.views.columns.date'),
            categories: days.map(({ date }) => formatDayMonth(date)),
            tooltipTitles: days.map(({ date }) => dayLabel(date)),
            series: [
              { key: 'sales', label: t('admin.reports.views.kpi.sales'), color: SERIES_COLORS.sales, values: days.map((d) => d.totals.sales) },
              { key: 'balance', label: t('admin.reports.views.kpi.balance'), color: SERIES_COLORS.balance, values: days.map((d) => balanceOf(d.totals)) },
            ],
            valueFormat: 'currency',
            axisFormat: 'compactCurrency',
          }
    blocks.push({ type: 'panel', key: 'chart', title: kind === 'week' ? t('admin.reports.views.summary.weeklyChart') : t('admin.reports.views.summary.chart'), content: [chart] })
  }

  if (game === 'all') {
    const byGame = totalsByGame(data.activity)
    const previousByGame = compare ? totalsByGame(previousActivity) : []
    blocks.push({
      type: 'panel',
      key: 'byGame',
      title: t('admin.reports.views.summary.byGame'),
      content: [
        {
          type: 'table',
          columns: totalsColumns(t, t('admin.reports.views.columns.game'), 'all'),
          rows: byGame.map(({ game: g, totals: x }, i) => totalsRow(g, gameLabel(t, g), x, previousByGame[i]?.totals)),
          footer: [totalsRow('total', totalLabel, totals, previous)],
        },
      ],
    })
  }

  const dayColumns = totalsColumns(t, t('admin.reports.views.columns.date'), game)
  const dayRows: DocRow[] = days.map(({ date, totals: x }) => totalsRow(date.toISOString(), dayLabel(date), x))

  // Semanas lun–dom del período, con su subtotal; la primera y la última pueden quedar incompletas.
  const weeks: { n: number; title: string; rows: DocRow[]; subtotal: Totals }[] = []
  let current: DocRow[] = []
  let subtotal = emptyTotals()
  days.forEach(({ date, totals: x }, i) => {
    current.push(dayRows[i])
    subtotal = addTotals(subtotal, x)
    if (date.getDay() !== 0 && i !== days.length - 1) return
    const n = weeks.length + 1
    const from = days[i - current.length + 1].date
    const title = t(current.length < 7 ? 'admin.reports.views.summary.weekTitleIncomplete' : 'admin.reports.views.summary.weekTitle', { n, from: formatDayMonth(from), to: formatDayMonth(date) })
    weeks.push({ n, title, rows: current, subtotal })
    current = []
    subtotal = emptyTotals()
  })
  const periodTotal = totalsRow('total', kind === 'month' ? t('admin.reports.views.summary.monthTotal') : totalLabel, totals)

  if (kind === 'month') {
    // Cada semana en su propia tabla con subtotal. Anchos fijos: las tablas quedan alineadas.
    blocks.push({
      type: 'panel',
      key: 'byDay',
      title: t('admin.reports.views.summary.byDay'),
      content: [
        ...weeks.map(
          (w): DocTable => ({
            type: 'table',
            title: w.title,
            columns: dayColumns,
            rows: [...w.rows, totalsRow(`week-${w.n}-subtotal`, t('admin.reports.views.summary.weekSubtotal', { n: w.n }), w.subtotal, undefined, 'subtotal')],
            fixedLayout: true,
          }),
        ),
        { type: 'table', columns: dayColumns, rows: [], footer: [periodTotal], fixedLayout: true, hideHeader: true },
      ],
    })
  } else if (multiDay) {
    blocks.push({
      type: 'panel',
      key: 'byDay',
      title: t('admin.reports.views.summary.byDay'),
      content: [{ type: 'table', columns: dayColumns, rows: dayRows, footer: [periodTotal] }],
    })
  }

  return { blocks, previousLabel }
}
