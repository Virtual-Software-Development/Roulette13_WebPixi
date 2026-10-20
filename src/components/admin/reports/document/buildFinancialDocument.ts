import type { TFunction } from 'i18next'
import type { ReportMachinesData, ReportPrizeTicket, ReportUnpaidPrizes } from '../../../../types/adminReports'
import { formatCount, formatDate, formatDayMonth } from '../../../../utils/reportFormat'
import { SERIES_COLORS, gameLabel, type BuildContext, type DocumentBody } from './documentHelpers'
import { addFinancial, bancasOf, cashNetOf, emptyFinancial, financialByGame, financialByMachine, totalsByDay, type FinancialRow } from './reportData'
import { column, type DocBlock, type DocColumn, type DocRow, type DocStat } from './reportDocument'

const EMPTY_MACHINES: ReportMachinesData = { machines: [], totals: [], amountRanges: [] }
const EMPTY_PRIZES = { count: 0, amount: 0, items: [], truncated: false }

const EXPIRING_SOON_DAYS = 7
const LIST_PAGE_SIZE = 10
const MS_PER_DAY = 86_400_000
const MONEY_KEYS = ['sales', 'prizes', 'balance', 'paid', 'pending', 'expired', 'cashNet'] as const

const moneyValues = (row: FinancialRow) => ({
  sales: row.sales,
  prizes: row.prizes,
  balance: row.sales - row.prizes,
  paid: row.paid,
  pending: row.pending,
  expired: row.expired,
  cashNet: cashNetOf(row),
})

function moneyColumns(t: TFunction, firstHeader: string, withConsorcio: boolean): DocColumn[] {
  return [
    column('label', firstHeader, 'text'),
    ...(withConsorcio ? [column('consorcio', t('admin.reports.views.activity.consorcio'), 'text')] : []),
    ...MONEY_KEYS.map((key) => column(key, t(`admin.reports.views.kpi.${key}`), 'currency')),
  ]
}

function moneyRow(key: string, label: string, consorcio: string, row: FinancialRow, extra?: Pick<DocRow, 'kind' | 'children'>): DocRow {
  return { key, cells: { label, consorcio, ...moneyValues(row) }, ...extra }
}

// Reporte Financiero: venta, premios, balance, pagado, pendiente, vencido y efectivo neto, en
// jerarquía consorcio -> banca -> máquina, más las listas de tickets pendientes y vencidos.
export function buildFinancialDocument(ctx: BuildContext): DocumentBody {
  const { t, period, game, data } = ctx
  const machinesData = data.machines ?? EMPTY_MACHINES
  const unpaid: ReportUnpaidPrizes = data.unpaidPrizes ?? { cutoff: period.end, pending: EMPTY_PRIZES, expired: EMPTY_PRIZES }
  const byMachine = financialByMachine(machinesData, game)
  const total = emptyFinancial()
  for (const row of byMachine.values()) addFinancial(total, row)
  const days = totalsByDay(data.activity, period, game)
  const ofGame = (ticket: ReportPrizeTicket) => game === 'all' || ticket.game === game
  const pending = unpaid.pending.items.filter(ofGame)
  const expired = unpaid.expired.items.filter(ofGame)
  // Con un juego, el total del backend (de ambos juegos) no aplica: se cuenta la lista.
  const pendingCount = game === 'all' ? unpaid.pending.count : pending.length
  const expiredCount = game === 'all' ? unpaid.expired.count : expired.length
  const totalRow = moneyRow('total', t('admin.reports.views.common.total'), '', total)

  // Por banca, con subtotal por consorcio; cada banca trae sus máquinas como filas hijas.
  const bancas = bancasOf(machinesData.machines)
  const consorcios = [...new Map(bancas.map((b) => [b.consorcio.id, b.consorcio])).values()]
  const bancaRows: DocRow[] = consorcios.flatMap((consorcio) => {
    const subtotal = emptyFinancial()
    const rows = bancas
      .filter((b) => b.consorcio.id === consorcio.id)
      .map(({ banca, machines }) => {
        const row = emptyFinancial()
        machines.forEach((m) => addFinancial(row, byMachine.get(m.id)!))
        addFinancial(subtotal, row)
        return moneyRow(banca.id, banca.name, consorcio.name, row, { children: machines.map((m) => moneyRow(m.id, m.name, '', byMachine.get(m.id)!)) })
      })
    return [...rows, moneyRow(`sub-${consorcio.id}`, t('admin.reports.views.financial.subtotal', { name: consorcio.name }), '', subtotal, { kind: 'subtotal' })]
  })

  const closeDate = unpaid.cutoff
  const daysLeft = (ticket: ReportPrizeTicket) => Math.max(0, Math.ceil((ticket.expiresAt.getTime() - closeDate.getTime()) / MS_PER_DAY))
  const expiringSoon = pending.filter((p) => daysLeft(p) <= EXPIRING_SOON_DAYS).length

  const totals = moneyValues(total)
  const stats: DocStat[] = MONEY_KEYS.map((key) => ({ key, label: t(`admin.reports.views.kpi.${key}`), value: totals[key], format: 'currency' }))

  const blocks: DocBlock[] = [{ type: 'stats', stats }]

  if (game === 'all') {
    blocks.push({
      type: 'panel',
      key: 'byGame',
      title: t('admin.reports.views.financial.byGame'),
      content: [
        {
          type: 'table',
          columns: moneyColumns(t, t('admin.reports.views.columns.game'), false),
          rows: financialByGame(machinesData).map(({ game: g, row }) => moneyRow(g, gameLabel(t, g), '', row)),
          footer: [totalRow],
        },
      ],
    })
  }

  if (days.length > 1) {
    blocks.push({
      type: 'panel',
      key: 'chart',
      title: t('admin.reports.views.financial.chart'),
      content: [
        {
          type: 'barChart',
          categoryLabel: t('admin.reports.views.columns.date'),
          categories: days.map((d) => formatDayMonth(d.date)),
          tooltipTitles: days.map((d) => formatDate(d.date)),
          series: [
            { key: 'sales', label: t('admin.reports.views.kpi.sales'), color: SERIES_COLORS.sales, values: days.map((d) => d.totals.sales) },
            { key: 'prizes', label: t('admin.reports.views.kpi.prizes'), color: SERIES_COLORS.prizes, values: days.map((d) => d.totals.prizes) },
            { key: 'balance', label: t('admin.reports.views.kpi.balance'), color: SERIES_COLORS.balance, values: days.map((d) => d.totals.sales - d.totals.prizes) },
          ],
          valueFormat: 'currency',
          axisFormat: 'compactCurrency',
        },
      ],
    })
  }

  const ticketColumns = (withSold: boolean) => [
    column('code', t('admin.reports.views.financial.code'), 'text'),
    column('game', t('admin.reports.views.columns.game'), 'text'),
    column('round', t('admin.reports.views.financial.roundOrDraw'), 'text'),
    ...(withSold ? [column('sold', t('admin.reports.views.financial.soldAt'), 'dateTime')] : []),
    column('prize', t('admin.reports.views.financial.prize'), 'currency'),
    column('expires', t('admin.reports.views.financial.expiresAt'), 'date', 'right'),
  ]
  const ticketCells = (r: ReportPrizeTicket) => ({ code: r.code, game: gameLabel(t, r.game), round: r.round, sold: r.soldAt, prize: r.prize, expires: r.expiresAt })

  blocks.push(
    {
      type: 'panel',
      key: 'byBanca',
      title: t('admin.reports.views.financial.byBanca'),
      subtitle: t('admin.reports.views.financial.byBancaHint'),
      content: [{ type: 'table', columns: moneyColumns(t, t('admin.reports.views.activity.bancaMachine'), true), rows: bancaRows, footer: [totalRow] }],
    },
    {
      type: 'panel',
      key: 'pending',
      title: t('admin.reports.views.financial.pendingList'),
      subtitle: t('admin.reports.views.financial.pendingSubtitle', { count: formatCount(pendingCount), soon: formatCount(expiringSoon), days: EXPIRING_SOON_DAYS, date: formatDate(closeDate) }),
      content: [
        {
          type: 'table',
          columns: [...ticketColumns(true), column('days', t('admin.reports.views.financial.daysLeft'), 'count')],
          rows: pending.map((r, i) => {
            const soon = daysLeft(r) <= EXPIRING_SOON_DAYS
            return { key: `${i}-${r.code}`, tone: soon ? 'warning' : undefined, cells: { ...ticketCells(r), days: soon ? { value: daysLeft(r), tag: 'warning' } : daysLeft(r) } }
          }),
          pageSize: LIST_PAGE_SIZE,
          emptyText: t('admin.reports.views.financial.noPending'),
        },
      ],
    },
    {
      type: 'panel',
      key: 'expired',
      title: t('admin.reports.views.financial.expiredList'),
      subtitle: t('admin.reports.views.financial.expiredSubtitle', { count: formatCount(expiredCount) }),
      content: [
        {
          type: 'table',
          columns: ticketColumns(false),
          rows: expired.map((r, i) => ({ key: `${i}-${r.code}`, cells: ticketCells(r) })),
          pageSize: LIST_PAGE_SIZE,
          emptyText: t('admin.reports.views.financial.noExpired'),
        },
      ],
    },
  )

  return { blocks }
}
