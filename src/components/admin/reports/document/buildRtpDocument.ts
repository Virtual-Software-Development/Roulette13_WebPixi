import type { TFunction } from 'i18next'
import {
  RTP_BAND,
  betTypeTotals,
  periodRounds,
  rouletteTargetAt,
  rtpChanges,
  rtpOf,
  theoreticalRtp,
  totalsByDay,
  totalsByGame,
  totalsFor,
  type RtpChange,
  type Totals,
} from '../../../../data/reportsMockData'
import type { ReportGame } from '../../../../types/adminReports'
import { formatDayMonth, formatPercent } from '../../../../utils/reportFormat'
import { isSameDay, periodDays } from '../../../../utils/reportPeriod'
import { SERIES_COLORS, gameLabel, roundsLabel, type BuildContext, type DocumentBody } from './documentHelpers'
import { column, type DocBlock, type DocLineChart, type DocPanel, type DocRow } from './reportDocument'

const PAGE_SIZE = 15
const TARGET_COLOR = '#8ea0b5'

const difference = (real: number | null, reference: number | null) => (real === null || reference === null ? null : real - reference)

function historyPanel(t: TFunction, changes: RtpChange[]): DocPanel {
  return {
    type: 'panel',
    key: 'history',
    title: t('admin.reports.views.rtp.history'),
    content: [
      {
        type: 'table',
        columns: [
          column('at', t('admin.reports.views.game.dateTime'), 'dateTime'),
          column('user', t('admin.reports.views.game.user'), 'text'),
          column('game', t('admin.reports.views.columns.game'), 'text'),
          column('from', t('admin.reports.views.rtp.oldValue'), 'percent'),
          column('to', t('admin.reports.views.rtp.newValue'), 'percent'),
        ],
        rows: changes.map((c) => ({ key: c.at.toISOString(), cells: { at: c.at, user: c.user, game: gameLabel(t, c.game), from: c.from, to: c.to } })),
        emptyText: t('admin.reports.views.rtp.noChanges'),
      },
    ],
  }
}

// RTP acumulado por día (premios ÷ venta desde el inicio del período).
function cumulativeByDay(days: { totals: Totals }[]): (number | null)[] {
  let sales = 0
  let prizes = 0
  return days.map(({ totals }) => {
    sales += totals.sales
    prizes += totals.prizes
    return sales > 0 ? (prizes / sales) * 100 : null
  })
}

function rtpChart(t: TFunction, days: Date[], series: DocLineChart['series'], extra?: Pick<DocLineChart, 'band' | 'markers' | 'markerLegend'>): DocPanel {
  return {
    type: 'panel',
    key: 'chart',
    title: t('admin.reports.views.rtp.chart'),
    content: [
      {
        type: 'lineChart',
        categoryLabel: t('admin.reports.views.columns.date'),
        categories: days.map(formatDayMonth),
        series,
        valueFormat: 'percent',
        axisFormat: 'percentAxis',
        ...extra,
      },
    ],
  }
}

function betTypeRtpPanel(t: TFunction, { period, now }: BuildContext, game: ReportGame): DocPanel {
  return {
    type: 'panel',
    key: 'betTypes',
    title: t('admin.reports.views.game.byBetType'),
    content: [
      {
        type: 'table',
        columns: [
          column('type', t('admin.reports.views.game.betType'), 'text'),
          column('amount', t('admin.reports.views.kpi.amountBet'), 'currency'),
          column('prizes', t('admin.reports.views.kpi.prizes'), 'currency'),
          column('real', t('admin.reports.views.kpi.rtpReal'), 'percent'),
          column('theoretical', t('admin.reports.views.kpi.rtpTheoretical'), 'percent'),
          column('diff', t('admin.reports.views.kpi.difference'), 'points'),
        ],
        rows: betTypeTotals(period, game, now).map((r) => {
          const real = rtpOf({ sales: r.amount, prizes: r.prizes })
          const theoretical = theoreticalRtp(game, r.type)
          return {
            key: r.type,
            cells: { type: t(`admin.reports.views.betTypes.${r.type}`), amount: r.amount, prizes: r.prizes, real, theoretical, diff: difference(real, theoretical) },
          }
        }),
      },
    ],
  }
}

function allGamesBlocks(t: TFunction, { period, now }: BuildContext): DocBlock[] {
  const target = rouletteTargetAt(period.end)
  const row = (key: string, label: string, totals: Totals, reference: number | null, consolidated = false): DocRow => ({
    key,
    cells: {
      game: label,
      rounds: totals.rounds,
      amount: totals.sales,
      prizes: totals.prizes,
      real: rtpOf(totals),
      reference: consolidated ? '' : reference,
      diff: consolidated ? '' : difference(rtpOf(totals), reference),
    },
  })
  return [
    {
      type: 'panel',
      key: 'byGame',
      title: t('admin.reports.views.rtp.byGame'),
      subtitle: t('admin.reports.views.rtp.byGameHint'),
      content: [
        {
          type: 'table',
          columns: [
            column('game', t('admin.reports.views.columns.game'), 'text'),
            column('rounds', roundsLabel(t, 'all'), 'count'),
            column('amount', t('admin.reports.views.kpi.amountBet'), 'currency'),
            column('prizes', t('admin.reports.views.kpi.prizes'), 'currency'),
            column('real', t('admin.reports.views.kpi.rtpReal'), 'percent'),
            column('reference', t('admin.reports.views.kpi.rtpReference'), 'percent'),
            column('diff', t('admin.reports.views.kpi.difference'), 'points'),
          ],
          rows: totalsByGame(period, now).map(({ game, totals }) => row(game, gameLabel(t, game), totals, game === 'roulette' ? target : null)),
          footer: [row('consolidated', t('admin.reports.views.rtp.consolidated'), totalsFor(period, 'all', now), null, true)],
        },
      ],
    },
    historyPanel(t, rtpChanges(period)),
  ]
}

function rouletteBlocks(t: TFunction, ctx: BuildContext): DocBlock[] {
  const { period, now } = ctx
  const totals = totalsFor(period, 'roulette', now)
  const changes = rtpChanges(period)
  const manual = periodRounds(period, 'roulette', now)
    .filter((r) => r.manual)
    .reverse()
  const days = periodDays(period)
  const rtp = rtpOf(totals)
  const target = rouletteTargetAt(period.end)
  const outOfBand = rtp !== null && (rtp < RTP_BAND.min || rtp > RTP_BAND.max)
  const kpi = (key: string) => t(`admin.reports.views.kpi.${key}`)

  const blocks: DocBlock[] = []
  if (outOfBand) {
    blocks.push({ type: 'alert', text: t('admin.reports.views.rtp.outOfBand', { rtp: formatPercent(rtp), min: formatPercent(RTP_BAND.min, 0), max: formatPercent(RTP_BAND.max, 0) }) })
  }
  blocks.push({
    type: 'stats',
    stats: [
      { key: 'real', label: kpi('rtpReal'), value: rtp, format: 'percent', tone: outOfBand ? 'warning' : undefined },
      { key: 'target', label: kpi('rtpTarget'), value: target, format: 'percent' },
      { key: 'band', label: kpi('rtpBand'), value: `${formatPercent(RTP_BAND.min, 0)} – ${formatPercent(RTP_BAND.max, 0)}`, format: 'text' },
      { key: 'diff', label: kpi('difference'), value: difference(rtp, target), format: 'points' },
      { key: 'rounds', label: kpi('rounds'), value: totals.rounds, format: 'count' },
      { key: 'amount', label: kpi('amountBet'), value: totals.sales, format: 'currency' },
    ],
  })
  if (days.length > 1) {
    blocks.push(
      rtpChart(
        t,
        days,
        [
          { key: 'rtp', label: t('admin.reports.views.rtp.cumulative'), color: SERIES_COLORS.rtp, values: cumulativeByDay(totalsByDay(period, 'roulette', now)) },
          { key: 'target', label: kpi('rtpTarget'), color: TARGET_COLOR, values: days.map(rouletteTargetAt), dashed: true },
        ],
        {
          band: { ...RTP_BAND, label: kpi('rtpBand') },
          markers: changes
            .map((c) => ({ index: days.findIndex((d) => isSameDay(d, c.at)), label: t('admin.reports.views.rtp.changeMarker', { from: formatPercent(c.from), to: formatPercent(c.to), user: c.user }) }))
            .filter((m) => m.index >= 0),
          markerLegend: t('admin.reports.views.rtp.change'),
        },
      ),
    )
  }
  blocks.push(betTypeRtpPanel(t, ctx, 'roulette'), {
    type: 'row',
    panels: [
      historyPanel(t, changes),
      {
        type: 'panel',
        key: 'manual',
        title: t('admin.reports.views.rtp.manualResults'),
        subtitle: t('admin.reports.views.rtp.manualResultsHint'),
        content: [
          {
            type: 'table',
            columns: [
              column('id', t('admin.reports.views.game.round'), 'text'),
              column('at', t('admin.reports.views.game.dateTime'), 'dateTime'),
              column('user', t('admin.reports.views.game.user'), 'text'),
              column('result', t('admin.reports.views.game.result'), 'text', 'right'),
            ],
            rows: manual.map((r) => ({ key: r.id, cells: { id: r.id, at: r.at, user: r.user ?? null, result: { value: r.result, strong: true } } })),
            pageSize: 10,
            emptyText: t('admin.reports.views.rtp.noManualResults'),
          },
        ],
      },
    ],
  })
  return blocks
}

function pickBlocks(t: TFunction, ctx: BuildContext, game: 'pick3' | 'pick4'): DocBlock[] {
  const { period, now } = ctx
  const totals = totalsFor(period, game, now)
  const days = periodDays(period)
  const kpi = (key: string) => t(`admin.reports.views.kpi.${key}`)
  // RTP por sorteo con el acumulado desde el inicio del período; la tabla va del más nuevo al más viejo.
  let sales = 0
  let prizes = 0
  const draws = periodRounds(period, game, now).map((round) => {
    sales += round.amount
    prizes += round.prizes
    return { round, cumulative: sales > 0 ? (prizes / sales) * 100 : null }
  })

  const blocks: DocBlock[] = [
    { type: 'note', text: t('admin.reports.views.rtp.noPayoutTable') },
    {
      type: 'stats',
      stats: [
        { key: 'real', label: kpi('rtpReal'), value: rtpOf(totals), format: 'percent' },
        { key: 'theoretical', label: kpi('rtpTheoretical'), value: null, format: 'percent' },
        { key: 'diff', label: kpi('difference'), value: null, format: 'points' },
        { key: 'draws', label: kpi('draws'), value: totals.rounds, format: 'count' },
        { key: 'amount', label: kpi('amountBet'), value: totals.sales, format: 'currency' },
      ],
    },
  ]
  if (days.length > 1) {
    blocks.push(rtpChart(t, days, [{ key: 'rtp', label: t('admin.reports.views.rtp.cumulative'), color: SERIES_COLORS.rtp, values: cumulativeByDay(totalsByDay(period, game, now)) }]))
  }
  blocks.push(betTypeRtpPanel(t, ctx, game), {
    type: 'panel',
    key: 'draws',
    title: t('admin.reports.views.rtp.byDraw'),
    content: [
      {
        type: 'table',
        columns: [
          column('id', t('admin.reports.views.game.draw'), 'text'),
          column('at', t('admin.reports.views.game.dateTime'), 'dateTime'),
          column('amount', kpi('amountBet'), 'currency'),
          column('prizes', kpi('prizes'), 'currency'),
          column('rtp', t('admin.reports.views.rtp.drawRtp'), 'percent'),
          column('cumulative', t('admin.reports.views.rtp.cumulative'), 'percent'),
        ],
        rows: draws.reverse().map(({ round, cumulative }) => ({
          key: round.id,
          cells: { id: round.id, at: round.at, amount: round.amount, prizes: round.prizes, rtp: rtpOf({ sales: round.amount, prizes: round.prizes }), cumulative },
        })),
        pageSize: PAGE_SIZE,
      },
    ],
  })
  return blocks
}

// Análisis de RTP: ruleta contra el objetivo de RTP Management y su banda; Pick contra el teórico
// de su tabla de pagos (todavía sin cargar -> "—"). Junto a cada RTP, rondas/sorteos y monto.
export function buildRtpDocument(ctx: BuildContext): DocumentBody {
  const { t, game } = ctx
  if (game === 'all') return { blocks: allGamesBlocks(t, ctx) }
  return { blocks: game === 'roulette' ? rouletteBlocks(t, ctx) : pickBlocks(t, ctx, game) }
}
