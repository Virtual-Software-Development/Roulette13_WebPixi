import { REPORT_GAMES as GAMES } from '../../../../api/adminReports'
import type { ReportGame, ReportMachinesData } from '../../../../types/adminReports'
import { reportCurrencySymbol } from '../../../../utils/reportFormat'
import { SERIES_COLORS, gameLabel, type BuildContext, type DocumentBody } from './documentHelpers'
import { amountDistribution, avgTicketOf, bancasOf, hourlyActivity, machineActivity, type MachineActivity } from './reportData'
import { column, type CellInput, type DocPanel, type DocRow } from './reportDocument'

const EMPTY_MACHINES: ReportMachinesData = { machines: [], totals: [], amountRanges: [] }
const pad2 = (n: number) => String(n).padStart(2, '0')
const hourRange = (hour: number) => `${pad2(hour)}:00 – ${pad2(hour)}:59`

interface SalesPoint {
  name: string
  consorcio: string
  // null en las máquinas (la columna es "máquinas con venta" de la banca).
  machinesWithSales: number | null
  tickets: number
  sales: number
  salesByGame: Record<ReportGame, number>
  // '' en el total (no aplica); null = sin venta ("—").
  lastSaleAt: Date | null | ''
}

function salesRow(key: string, point: SalesPoint, withGames: boolean, children?: DocRow[]): DocRow {
  const cells: Record<string, CellInput> = {
    name: point.name,
    consorcio: point.consorcio,
    machines: point.machinesWithSales ?? '',
    tickets: point.tickets,
    sales: point.sales,
    avg: avgTicketOf(point),
    last: point.lastSaleAt,
  }
  if (withGames) GAMES.forEach((g) => (cells[`sales-${g}`] = point.salesByGame[g]))
  return { key, cells, children }
}

function machinePoint(activity: MachineActivity): SalesPoint {
  return {
    name: activity.machine.name,
    consorcio: '',
    machinesWithSales: null,
    tickets: activity.tickets,
    sales: activity.sales,
    salesByGame: activity.salesByGame,
    lastSaleAt: activity.lastSaleAt,
  }
}

// Actividad por punto de venta (antes "Reporte de Jugadores"): volumen y comportamiento de venta
// por banca, máquina y hora. No hace cuadre de dinero (eso es el Financiero).
export function buildSalesActivityDocument({ t, game, data }: BuildContext): DocumentBody {
  const machinesData = data.machines ?? EMPTY_MACHINES
  const machines = machineActivity(machinesData, game)
  const hours = hourlyActivity(data.activity, game)
  const distribution = amountDistribution(machinesData, game)
  const withGames = game === 'all'

  const bancaPoints = bancasOf(machinesData.machines).map(({ banca, consorcio }) => {
    const own = machines.filter((m) => m.machine.banca.id === banca.id)
    const children = own.filter((m) => m.tickets > 0)
    const salesByGame = { roulette: 0, quickMoney: 0 } as Record<ReportGame, number>
    own.forEach((m) => GAMES.forEach((g) => (salesByGame[g] += m.salesByGame[g])))
    const point: SalesPoint = {
      name: banca.name,
      consorcio: consorcio.name,
      machinesWithSales: children.length,
      tickets: own.reduce((s, m) => s + m.tickets, 0),
      sales: own.reduce((s, m) => s + m.sales, 0),
      salesByGame,
      lastSaleAt: own.reduce<Date | null>((last, m) => (m.lastSaleAt && (!last || m.lastSaleAt > last) ? m.lastSaleAt : last), null),
    }
    return { key: banca.id, point, children }
  })

  const total: SalesPoint = {
    name: t('admin.reports.views.common.total'),
    consorcio: '',
    machinesWithSales: bancaPoints.reduce((s, b) => s + (b.point.machinesWithSales ?? 0), 0),
    tickets: bancaPoints.reduce((s, b) => s + b.point.tickets, 0),
    sales: bancaPoints.reduce((s, b) => s + b.point.sales, 0),
    salesByGame: Object.fromEntries(GAMES.map((g) => [g, bancaPoints.reduce((s, b) => s + b.point.salesByGame[g], 0)])) as Record<ReportGame, number>,
    lastSaleAt: '',
  }

  const distributionTotal = distribution.reduce((s, d) => s + d.tickets, 0)
  // Máquinas activas sin ventas en el período.
  const idle = machines.filter((m) => m.tickets === 0 && m.machine.isActive)

  const byBancaPanel: DocPanel = {
    type: 'panel',
    key: 'byBanca',
    title: t('admin.reports.views.activity.byBanca'),
    subtitle: t('admin.reports.views.activity.byBancaHint'),
    content: [
      {
        type: 'table',
        columns: [
          column('name', t('admin.reports.views.activity.bancaMachine'), 'text'),
          column('consorcio', t('admin.reports.views.activity.consorcio'), 'text'),
          column('machines', t('admin.reports.views.activity.machinesWithSales'), 'count'),
          column('tickets', t('admin.reports.views.kpi.tickets'), 'count'),
          column('sales', t('admin.reports.views.kpi.sales'), 'currency'),
          // Con "Todos", la venta desglosada por juego.
          ...(withGames ? GAMES.map((g) => column(`sales-${g}`, gameLabel(t, g), 'currency')) : []),
          column('avg', t('admin.reports.views.kpi.avgTicket'), 'currency'),
          column('last', t('admin.reports.views.activity.lastSale'), 'dateTime', 'right'),
        ],
        rows: bancaPoints.map((b) =>
          salesRow(
            b.key,
            b.point,
            withGames,
            b.children.map((m) => salesRow(m.machine.id, machinePoint(m), withGames)),
          ),
        ),
        footer: [salesRow('total', total, withGames)],
      },
    ],
  }

  const hourColumns = [
    column('hour', t('admin.reports.views.activity.hour'), 'text'),
    column('tickets', t('admin.reports.views.kpi.tickets'), 'count'),
    column('sales', t('admin.reports.views.kpi.sales'), 'currency'),
  ]
  const hourRow = (h: (typeof hours)[number]): DocRow => ({ key: String(h.hour), cells: { hour: hourRange(h.hour), tickets: h.tickets, sales: h.sales } })
  const hourlyChartPanel: DocPanel = {
    type: 'panel',
    key: 'hourlyChart',
    title: t('admin.reports.views.activity.hourlyChart'),
    content: [
      {
        type: 'barChart',
        categoryLabel: t('admin.reports.views.activity.hour'),
        categories: hours.map((h) => pad2(h.hour)),
        tooltipTitles: hours.map((h) => hourRange(h.hour)),
        series: [{ key: 'tickets', label: t('admin.reports.views.kpi.tickets'), color: SERIES_COLORS.sales, values: hours.map((h) => h.tickets) }],
        valueFormat: 'count',
        height: 300,
      },
    ],
  }
  const hourlyPanel: DocPanel = {
    type: 'panel',
    key: 'hourly',
    title: t('admin.reports.views.activity.hourly'),
    content: [{ type: 'table', columns: hourColumns, rows: hours.map(hourRow), pageSize: 12 }],
  }
  const distributionPanel: DocPanel = {
    type: 'panel',
    key: 'distribution',
    title: t('admin.reports.views.activity.amountDistribution'),
    content: [
      {
        type: 'table',
        columns: [
          column('range', t('admin.reports.views.activity.amountRange'), 'text'),
          column('tickets', t('admin.reports.views.kpi.tickets'), 'count'),
          column('share', t('admin.reports.views.activity.share'), 'percent1'),
        ],
        rows: distribution.map((d) => ({
          key: d.key,
          cells: {
            range: t(`admin.reports.views.activity.ranges.${d.key}`, { currency: reportCurrencySymbol() }),
            tickets: d.tickets,
            share: distributionTotal > 0 ? (d.tickets / distributionTotal) * 100 : null,
          },
        })),
      },
    ],
  }
  const idlePanel: DocPanel = {
    type: 'panel',
    key: 'idle',
    title: t('admin.reports.views.activity.idleMachines'),
    subtitle: t('admin.reports.views.activity.idleMachinesHint'),
    content: [
      {
        type: 'table',
        columns: [
          column('machine', t('admin.reports.views.activity.machine'), 'text'),
          column('banca', t('admin.reports.views.activity.banca'), 'text'),
          column('consorcio', t('admin.reports.views.activity.consorcio'), 'text'),
        ],
        rows: idle.map((m) => ({ key: m.machine.id, cells: { machine: m.machine.name, banca: m.machine.banca.name, consorcio: m.machine.consorcio.name } })),
        emptyText: t('admin.reports.views.activity.noIdleMachines'),
      },
    ],
  }

  return {
    blocks: [byBancaPanel, { type: 'row', panels: [hourlyChartPanel, hourlyPanel] }, { type: 'row', panels: [distributionPanel, idlePanel] }],
  }
}
