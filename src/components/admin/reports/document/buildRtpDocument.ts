import type { TFunction } from 'i18next'
import type { ReportGame, ReportRtpChange, ReportRtpData, ReportSubstitution } from '../../../../types/adminReports'
import { formatDayMonth, formatPercent } from '../../../../utils/reportFormat'
import { isSameDay, periodDays } from '../../../../utils/reportPeriod'
import { SERIES_COLORS, gameLabel, roundsLabel, type BuildContext, type DocumentBody } from './documentHelpers'
import { betTypeLabel } from './buildGameDocument'
import { betTypesOf, dailyTargets, periodTarget, rtpOf, rtpSettingsOf, totalsByDay, totalsByGame, totalsFor, type Totals } from './reportData'
import { column, type DocBlock, type DocLineChart, type DocPanel, type DocRow } from './reportDocument'

const PAGE_SIZE = 15
const TARGET_COLOR = '#8ea0b5'
const EMPTY_RTP: ReportRtpData = { games: [], targets: [], changes: [] }

const difference = (real: number | null, reference: number | null) => (real === null || reference === null ? null : real - reference)

function historyPanel(t: TFunction, changes: ReportRtpChange[]): DocPanel {
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
        rows: changes.map((c, i) => ({ key: `${i}-${c.at.toISOString()}`, cells: { at: c.at, user: c.user, game: gameLabel(t, c.game), from: c.from, to: c.to } })),
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

function betTypeRtpPanel(t: TFunction, { data }: BuildContext, game: ReportGame): DocPanel {
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
        rows: betTypesOf(data.game?.betTypes ?? [], game).map((r) => {
          const real = rtpOf({ sales: r.amount, prizes: r.prizes })
          return {
            key: `${r.code}-${r.digits ?? ''}`,
            cells: { type: betTypeLabel(t, r), amount: r.amount, prizes: r.prizes, real, theoretical: r.theoreticalRtp, diff: difference(real, r.theoreticalRtp) },
          }
        }),
      },
    ],
  }
}

function manualResultsPanel(t: TFunction, game: ReportGame, substitutions: ReportSubstitution[]): DocPanel {
  const rows = substitutions.filter((s) => s.game === game).reverse()
  return {
    type: 'panel',
    key: 'manual',
    title: t('admin.reports.views.rtp.manualResults'),
    subtitle: t('admin.reports.views.rtp.manualResultsHint'),
    content: [
      {
        type: 'table',
        columns: [
          column('id', t(game === 'roulette' ? 'admin.reports.views.game.round' : 'admin.reports.views.game.draw'), 'text'),
          column('at', t('admin.reports.views.game.dateTime'), 'dateTime'),
          column('user', t('admin.reports.views.game.user'), 'text'),
          column('result', t('admin.reports.views.game.result'), 'text', 'right'),
        ],
        rows: rows.map((s, i) => ({
          key: `${i}-${s.round}`,
          cells: { id: s.round, at: s.at, user: s.user ? s.user.fullName || s.user.username : null, result: { value: s.newResult, strong: true } },
        })),
        pageSize: 10,
        emptyText: t('admin.reports.views.rtp.noManualResults'),
      },
    ],
  }
}

function allGamesBlocks(t: TFunction, { period, data }: BuildContext): DocBlock[] {
  const rtp = data.rtp ?? EMPTY_RTP
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
          rows: totalsByGame(data.activity).map(({ game, totals }) => row(game, gameLabel(t, game), totals, periodTarget(rtp, data.activity, period, game))),
          footer: [row('consolidated', t('admin.reports.views.rtp.consolidated'), totalsFor(data.activity, 'all'), null, true)],
        },
      ],
    },
    historyPanel(t, rtp.changes),
  ]
}

// Un juego contra su objetivo de RTP Management (perfil o base de cada día) y su banda.
function gameBlocks(t: TFunction, ctx: BuildContext, game: ReportGame): DocBlock[] {
  const { period, data } = ctx
  const rtpData = data.rtp ?? EMPTY_RTP
  const settings = rtpSettingsOf(rtpData, game)
  const totals = totalsFor(data.activity, game)
  const changes = rtpData.changes.filter((c) => c.game === game)
  const days = periodDays(period)
  const rtp = rtpOf(totals)
  const target = periodTarget(rtpData, data.activity, period, game)
  const outOfBand = rtp !== null && settings !== null && (rtp < settings.minBand || rtp > settings.maxBand)
  const kpi = (key: string) => t(`admin.reports.views.kpi.${key}`)
  const isRoulette = game === 'roulette'

  const blocks: DocBlock[] = []
  if (!isRoulette) blocks.push({ type: 'note', text: t('admin.reports.views.rtp.noTheoretical') })
  if (outOfBand && settings) {
    blocks.push({ type: 'alert', text: t('admin.reports.views.rtp.outOfBand', { rtp: formatPercent(rtp), min: formatPercent(settings.minBand, 0), max: formatPercent(settings.maxBand, 0) }) })
  }
  blocks.push({
    type: 'stats',
    stats: [
      { key: 'real', label: kpi('rtpReal'), value: rtp, format: 'percent', tone: outOfBand ? 'warning' : undefined },
      { key: 'target', label: kpi('rtpTarget'), value: target, format: 'percent' },
      { key: 'band', label: kpi('rtpBand'), value: settings ? `${formatPercent(settings.minBand, 0)} – ${formatPercent(settings.maxBand, 0)}` : null, format: 'text' },
      { key: 'diff', label: kpi('difference'), value: difference(rtp, target), format: 'points' },
      { key: 'rounds', label: kpi(isRoulette ? 'rounds' : 'draws'), value: totals.rounds, format: 'count' },
      { key: 'amount', label: kpi('amountBet'), value: totals.sales, format: 'currency' },
    ],
  })
  if (days.length > 1) {
    blocks.push(
      rtpChart(
        t,
        days,
        [
          { key: 'rtp', label: t('admin.reports.views.rtp.cumulative'), color: SERIES_COLORS.rtp, values: cumulativeByDay(totalsByDay(data.activity, period, game)) },
          { key: 'target', label: kpi('rtpTarget'), color: TARGET_COLOR, values: dailyTargets(rtpData, period, game), dashed: true },
        ],
        {
          band: settings ? { min: settings.minBand, max: settings.maxBand, label: kpi('rtpBand') } : undefined,
          markers: changes
            .map((c) => ({
              index: days.findIndex((d) => isSameDay(d, c.at)),
              label: t('admin.reports.views.rtp.changeMarker', { from: formatPercent(c.from), to: formatPercent(c.to), user: c.user ?? '—' }),
            }))
            .filter((m) => m.index >= 0),
          markerLegend: t('admin.reports.views.rtp.change'),
        },
      ),
    )
  }
  blocks.push(betTypeRtpPanel(t, ctx, game), { type: 'row', panels: [historyPanel(t, changes), manualResultsPanel(t, game, data.substitutions ?? [])] })

  if (!isRoulette) {
    // RTP por sorteo con el acumulado desde el inicio del período; la tabla va del más nuevo al más viejo.
    let sales = 0
    let prizes = 0
    const draws = [...(data.rounds?.quickMoney?.items ?? [])].reverse().map((round) => {
      sales += round.amount
      prizes += round.prizes
      return { round, cumulative: sales > 0 ? (prizes / sales) * 100 : null }
    })
    blocks.push({
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
            cells: { id: round.code, at: round.at, amount: round.amount, prizes: round.prizes, rtp: rtpOf({ sales: round.amount, prizes: round.prizes }), cumulative },
          })),
          pageSize: PAGE_SIZE,
          emptyText: t('admin.reports.views.game.noRounds'),
        },
      ],
    })
  }
  return blocks
}

// Análisis de RTP: cada juego contra su objetivo y banda de RTP Management, más el RTP teórico de
// cada tipo de apuesta (solo ruleta). Junto a cada RTP, rondas/sorteos y monto.
export function buildRtpDocument(ctx: BuildContext): DocumentBody {
  const { t, game } = ctx
  if (game === 'all') return { blocks: allGamesBlocks(t, ctx) }
  return { blocks: gameBlocks(t, ctx, game) }
}
