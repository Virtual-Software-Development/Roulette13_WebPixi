import type { TFunction } from 'i18next'
import {
  ROULETTE_SLOTS,
  balanceOf,
  betTypeTotals,
  digitFrequency,
  periodRounds,
  rouletteFrequency,
  rouletteGroupSummary,
  rtpOf,
  topPlayedNumbers,
  totalsByGame,
  totalsFor,
  type BetTypeTotals,
  type RoundRecord,
  type Totals,
} from '../../../../data/reportsMockData'
import type { ReportGame } from '../../../../types/adminReports'
import { formatCount } from '../../../../utils/reportFormat'
import { SERIES_COLORS, gameLabel, roundsLabel, type BuildContext, type DocumentBody } from './documentHelpers'
import { column, type DocBlock, type DocPanel, type DocRow } from './reportDocument'

const DETAIL_PAGE_SIZE = 15

function gameRow(key: string, label: string, totals: Totals): DocRow {
  return {
    key,
    cells: {
      game: label,
      rounds: totals.rounds,
      tickets: totals.tickets,
      bets: totals.bets,
      amount: totals.sales,
      prizes: totals.prizes,
      balance: balanceOf(totals),
      rtp: rtpOf(totals),
    },
  }
}

function betTypeRow(key: string, label: string, r: Pick<BetTypeTotals, 'bets' | 'amount' | 'prizes'>): DocRow {
  return {
    key,
    cells: { type: label, bets: r.bets, amount: r.amount, prizes: r.prizes, balance: r.amount - r.prizes, rtp: r.amount > 0 ? (r.prizes / r.amount) * 100 : null },
  }
}

function betTypesPanel(t: TFunction, rows: BetTypeTotals[]): DocPanel {
  const total = rows.reduce((acc, r) => ({ bets: acc.bets + r.bets, amount: acc.amount + r.amount, prizes: acc.prizes + r.prizes }), { bets: 0, amount: 0, prizes: 0 })
  return {
    type: 'panel',
    key: 'betTypes',
    title: t('admin.reports.views.game.byBetType'),
    content: [
      {
        type: 'table',
        columns: [
          column('type', t('admin.reports.views.game.betType'), 'text'),
          column('bets', t('admin.reports.views.game.betsCount'), 'count'),
          column('amount', t('admin.reports.views.kpi.amountBet'), 'currency'),
          column('prizes', t('admin.reports.views.kpi.prizes'), 'currency'),
          column('balance', t('admin.reports.views.kpi.balance'), 'currency'),
          column('rtp', t('admin.reports.views.kpi.rtp'), 'percent'),
        ],
        rows: rows.map((r) => betTypeRow(r.type, t(`admin.reports.views.betTypes.${r.type}`), r)),
        footer: [betTypeRow('total', t('admin.reports.views.common.total'), total)],
      },
    ],
  }
}

function roundDetailPanel(ctx: BuildContext, rounds: RoundRecord[], game: ReportGame): DocPanel {
  const { t } = ctx
  const isRoulette = game === 'roulette'
  const columns = [
    column('id', t(isRoulette ? 'admin.reports.views.game.round' : 'admin.reports.views.game.draw'), 'text'),
    column('at', t('admin.reports.views.game.dateTime'), 'dateTime'),
    column('result', t('admin.reports.views.game.result'), 'text', 'right'),
    ...(isRoulette ? [column('origin', t('admin.reports.views.game.origin'), 'text'), column('user', t('admin.reports.views.game.user'), 'text')] : []),
    column('tickets', t('admin.reports.views.kpi.tickets'), 'count'),
    column('amount', t('admin.reports.views.kpi.amountBet'), 'currency'),
    column('prizes', t('admin.reports.views.kpi.prizes'), 'currency'),
    column('balance', t('admin.reports.views.kpi.balance'), 'currency'),
  ]
  const manual = t('admin.reports.views.game.manual')
  const automatic = t('admin.reports.views.game.automatic')
  return {
    type: 'panel',
    key: 'rounds',
    title: t(isRoulette ? 'admin.reports.views.game.roundDetail' : 'admin.reports.views.game.drawDetail'),
    content: [
      {
        type: 'table',
        columns,
        rows: rounds.map((r) => ({
          key: r.id,
          cells: {
            id: r.id,
            at: r.at,
            result: { value: r.result, strong: true },
            origin: { value: r.manual ? manual : automatic, tag: r.manual ? 'manual' : 'plain' },
            user: r.user ?? null,
            tickets: r.tickets,
            amount: r.amount,
            prizes: r.prizes,
            balance: r.amount - r.prizes,
          },
        })),
        pageSize: DETAIL_PAGE_SIZE,
      },
    ],
  }
}

function rouletteBlocks(t: TFunction, ctx: BuildContext): DocBlock[] {
  const { period, now } = ctx
  const frequency = rouletteFrequency(period, now)
  const groups = rouletteGroupSummary(frequency)
  const totalRounds = frequency.reduce((sum, f) => sum + f.count, 0)
  const frequencyPanel: DocPanel = {
    type: 'panel',
    key: 'frequency',
    title: t('admin.reports.views.game.frequencyChart'),
    subtitle: t('admin.reports.views.game.frequencySubtitle', { rounds: formatCount(totalRounds) }),
    content: [
      {
        type: 'barChart',
        categoryLabel: t('admin.reports.views.game.number'),
        categories: ROULETTE_SLOTS,
        series: [{ key: 'count', label: t('admin.reports.views.game.times'), color: SERIES_COLORS.sales, values: frequency.map((f) => f.count) }],
        reference: { value: totalRounds / 38, label: t('admin.reports.views.game.expected') },
        valueFormat: 'roundCount',
        height: 300,
      },
    ],
  }
  const groupsPanel: DocPanel = {
    type: 'panel',
    key: 'groups',
    title: t('admin.reports.views.game.groupSummary'),
    content: [
      {
        type: 'table',
        columns: [
          column('group', t('admin.reports.views.game.group'), 'text'),
          column('count', t('admin.reports.views.game.times'), 'count'),
          column('expected', t('admin.reports.views.game.expected'), 'count'),
          column('share', t('admin.reports.views.game.share'), 'percent'),
        ],
        rows: groups.map((g) => ({
          key: g.key,
          cells: {
            group: t(`admin.reports.views.game.groups.${g.key}`),
            count: g.count,
            expected: Math.round((totalRounds * g.slots) / 38),
            share: totalRounds > 0 ? (g.count / totalRounds) * 100 : null,
          },
        })),
      },
    ],
  }
  return [
    betTypesPanel(t, betTypeTotals(period, 'roulette', now)),
    { type: 'row', panels: [frequencyPanel, groupsPanel] },
    roundDetailPanel(ctx, periodRounds(period, 'roulette', now).slice().reverse(), 'roulette'),
  ]
}

function pickBlocks(t: TFunction, ctx: BuildContext, game: 'pick3' | 'pick4'): DocBlock[] {
  const { period, now } = ctx
  const top = topPlayedNumbers(period, game, now)
  const digits = digitFrequency(period, game, now)
  return [
    betTypesPanel(t, betTypeTotals(period, game, now)),
    {
      type: 'row',
      panels: [
        {
          type: 'panel',
          key: 'top',
          title: t('admin.reports.views.game.topNumbers'),
          content: [
            {
              type: 'table',
              columns: [
                column('rank', '#', 'text'),
                column('number', t('admin.reports.views.game.number'), 'text'),
                column('bets', t('admin.reports.views.game.betsCount'), 'count'),
                column('amount', t('admin.reports.views.kpi.amountBet'), 'currency'),
              ],
              rows: top.map((r, i) => ({ key: r.number, cells: { rank: String(i + 1), number: { value: r.number, strong: true }, bets: r.bets, amount: r.amount } })),
            },
          ],
        },
        {
          type: 'panel',
          key: 'digits',
          title: t('admin.reports.views.game.digitFrequency'),
          subtitle: t('admin.reports.views.game.digitFrequencySubtitle'),
          content: [
            {
              type: 'table',
              columns: [
                column('digit', t('admin.reports.views.game.digit'), 'text'),
                ...digits.map((_, p) => column(`p${p}`, t('admin.reports.views.game.position', { n: p + 1 }), 'count')),
              ],
              rows: Array.from({ length: 10 }, (_, digit) => ({
                key: String(digit),
                cells: { digit: { value: String(digit), strong: true }, ...Object.fromEntries(digits.map((position, p) => [`p${p}`, position[digit]])) },
              })),
            },
          ],
        },
      ],
    },
    roundDetailPanel(ctx, periodRounds(period, game, now).slice().reverse(), game),
  ]
}

// Reporte de Juego: qué se apuesta (tipos de apuesta), qué sale (frecuencia) y cómo fue cada
// ronda/sorteo. Con "Todos" solo la tabla por juego (el detalle se ve eligiendo un juego).
export function buildGameDocument(ctx: BuildContext): DocumentBody {
  const { t, period, game, now } = ctx
  if (game === 'roulette') return { blocks: rouletteBlocks(t, ctx) }
  if (game !== 'all') return { blocks: pickBlocks(t, ctx, game) }

  return {
    blocks: [
      {
        type: 'panel',
        key: 'byGame',
        title: t('admin.reports.views.game.byGame'),
        subtitle: ctx.byGame ? undefined : t('admin.reports.views.game.byGameHint'),
        content: [
          {
            type: 'table',
            columns: [
              column('game', t('admin.reports.views.columns.game'), 'text'),
              column('rounds', roundsLabel(t, 'all'), 'count'),
              column('tickets', t('admin.reports.views.kpi.tickets'), 'count'),
              column('bets', t('admin.reports.views.kpi.bets'), 'count'),
              column('amount', t('admin.reports.views.kpi.amountBet'), 'currency'),
              column('prizes', t('admin.reports.views.kpi.prizes'), 'currency'),
              column('balance', t('admin.reports.views.kpi.balance'), 'currency'),
              column('rtp', t('admin.reports.views.kpi.rtp'), 'percent'),
            ],
            rows: totalsByGame(period, now).map(({ game: g, totals }) => gameRow(g, gameLabel(t, g), totals)),
            footer: [gameRow('total', t('admin.reports.views.common.total'), totalsFor(period, 'all', now))],
          },
        ],
      },
    ],
  }
}
