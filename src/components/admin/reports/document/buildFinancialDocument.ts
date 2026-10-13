import type { TFunction } from 'i18next'
import {
  BANCAS,
  CONSORCIOS,
  MACHINES,
  addFinancial,
  bancaById,
  cashNetOf,
  emptyFinancial,
  expiredTickets,
  financialByGame,
  financialByMachine,
  pendingTickets,
  totalsByDay,
  type FinancialRow,
  type PrizeTicket,
} from '../../../../data/reportsMockData'
import { formatCount, formatDate, formatDayMonth } from '../../../../utils/reportFormat'
import { SERIES_COLORS, gameLabel, type BuildContext, type DocumentBody } from './documentHelpers'
import { column, type DocBlock, type DocColumn, type DocRow, type DocStat } from './reportDocument'

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
  const { t, period, game, now } = ctx
  const byMachine = financialByMachine(period, game, now)
  const total = emptyFinancial()
  for (const row of byMachine.values()) addFinancial(total, row)
  const days = totalsByDay(period, game, now)
  const pending = pendingTickets(period, game, now)
  const expired = expiredTickets(period, game, now)
  const totalRow = moneyRow('total', t('admin.reports.views.common.total'), '', total)

  // Por banca, con subtotal por consorcio; cada banca trae sus máquinas como filas hijas.
  const bancaRows: DocRow[] = CONSORCIOS.flatMap((consorcio) => {
    const subtotal = emptyFinancial()
    const rows = BANCAS.filter((b) => b.consorcioId === consorcio.id).map((banca) => {
      const machines = MACHINES.filter((m) => m.bancaId === banca.id)
      const row = emptyFinancial()
      machines.forEach((m) => addFinancial(row, byMachine.get(m.id)!))
      addFinancial(subtotal, row)
      return moneyRow(banca.id, banca.name, consorcio.name, row, { children: machines.map((m) => moneyRow(m.id, m.code, '', byMachine.get(m.id)!)) })
    })
    return [...rows, moneyRow(`sub-${consorcio.id}`, t('admin.reports.views.financial.subtotal', { name: consorcio.name }), '', subtotal, { kind: 'subtotal' })]
  })

  const closeDate = period.end
  const daysLeft = (ticket: PrizeTicket) => Math.round((ticket.expiresAt.getTime() - closeDate.getTime()) / MS_PER_DAY)
  const expiringSoon = pending.filter((p) => daysLeft(p) <= EXPIRING_SOON_DAYS).length
  const location = (ticket: PrizeTicket) => `${bancaById(ticket.machine.bancaId).name} · ${ticket.machine.code}`

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
          rows: financialByGame(period, now).map(({ game: g, row }) => moneyRow(g, gameLabel(t, g), '', row)),
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
    column('location', t('admin.reports.views.financial.saleLocation'), 'text'),
    column('round', t('admin.reports.views.financial.roundOrDraw'), 'text'),
    ...(withSold ? [column('sold', t('admin.reports.views.financial.soldAt'), 'dateTime')] : []),
    column('prize', t('admin.reports.views.financial.prize'), 'currency'),
    column('expires', t('admin.reports.views.financial.expiresAt'), 'date', 'right'),
  ]
  const ticketCells = (r: PrizeTicket) => ({ code: r.code, game: gameLabel(t, r.game), location: location(r), round: r.roundId, sold: r.soldAt, prize: r.prize, expires: r.expiresAt })

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
      subtitle: t('admin.reports.views.financial.pendingSubtitle', { count: formatCount(pending.length), soon: formatCount(expiringSoon), days: EXPIRING_SOON_DAYS, date: formatDate(closeDate) }),
      content: [
        {
          type: 'table',
          columns: [...ticketColumns(true), column('days', t('admin.reports.views.financial.daysLeft'), 'count')],
          rows: pending.map((r) => {
            const soon = daysLeft(r) <= EXPIRING_SOON_DAYS
            return { key: r.code, tone: soon ? 'warning' : undefined, cells: { ...ticketCells(r), days: soon ? { value: daysLeft(r), tag: 'warning' } : daysLeft(r) } }
          }),
          pageSize: LIST_PAGE_SIZE,
        },
      ],
    },
    {
      type: 'panel',
      key: 'expired',
      title: t('admin.reports.views.financial.expiredList'),
      subtitle: t('admin.reports.views.financial.expiredSubtitle', { count: formatCount(expired.length) }),
      content: [
        {
          type: 'table',
          columns: ticketColumns(false),
          rows: expired.map((r) => ({ key: r.code, cells: ticketCells(r) })),
          pageSize: LIST_PAGE_SIZE,
          emptyText: t('admin.reports.views.financial.noExpired'),
        },
      ],
    },
  )

  return { blocks }
}
