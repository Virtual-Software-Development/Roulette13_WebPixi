import type { TFunction } from 'i18next'
import type { ReportBetType, ReportGame, ReportGameData, ReportRound, ReportRounds } from '../../../../types/adminReports'
import { formatCount } from '../../../../utils/reportFormat'
import { SERIES_COLORS, gameLabel, roundsLabel, type BuildContext, type DocumentBody } from './documentHelpers'
import { ROULETTE_SLOTS, balanceOf, betTypeKey, betTypesOf, rouletteGroupSummary, rtpOf, totalsByGame, totalsFor, type Totals } from './reportData'
import { column, type DocBlock, type DocPanel, type DocRow } from './reportDocument'

const DETAIL_PAGE_SIZE = 15

const EMPTY_GAME_DATA: ReportGameData = {
  betTypes: [],
  rouletteRounds: 0,
  rouletteFrequency: ROULETTE_SLOTS.map((slot) => ({ slot, count: 0 })),
  digits: { draws: 0, pick3: [], pick4: [] },
  topNumbers: [],
}

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

export const betTypeLabel = (t: TFunction, row: Pick<ReportBetType, 'game' | 'code' | 'digits' | 'name'>) =>
  t(`admin.reports.views.betTypes.${betTypeKey(row.game, row.code, row.digits)}`, { defaultValue: row.name })

function betTypeRow(key: string, label: string, r: Pick<ReportBetType, 'bets' | 'amount' | 'prizes'>): DocRow {
  return {
    key,
    cells: { type: label, bets: r.bets, amount: r.amount, prizes: r.prizes, balance: r.amount - r.prizes, rtp: r.amount > 0 ? (r.prizes / r.amount) * 100 : null },
  }
}

function betTypesPanel(t: TFunction, rows: ReportBetType[]): DocPanel {
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
        rows: rows.map((r) => betTypeRow(`${r.code}-${r.digits ?? ''}`, betTypeLabel(t, r), r)),
        footer: [betTypeRow('total', t('admin.reports.views.common.total'), total)],
      },
    ],
  }
}

function roundDetailPanel(t: TFunction, rounds: ReportRounds | undefined, game: ReportGame): DocPanel {
  const isRoulette = game === 'roulette'
  const columns = [
    column('id', t(isRoulette ? 'admin.reports.views.game.round' : 'admin.reports.views.game.draw'), 'text'),
    column('at', t('admin.reports.views.game.dateTime'), 'dateTime'),
    column('result', t('admin.reports.views.game.result'), 'text', 'right'),
    column('origin', t('admin.reports.views.game.origin'), 'text'),
    column('user', t('admin.reports.views.game.user'), 'text'),
    column('tickets', t('admin.reports.views.kpi.tickets'), 'count'),
    column('amount', t('admin.reports.views.kpi.amountBet'), 'currency'),
    column('prizes', t('admin.reports.views.kpi.prizes'), 'currency'),
    column('balance', t('admin.reports.views.kpi.balance'), 'currency'),
  ]
  const manual = t('admin.reports.views.game.manual')
  const automatic = t('admin.reports.views.game.automatic')
  const items = rounds?.items ?? []
  return {
    type: 'panel',
    key: 'rounds',
    title: t(isRoulette ? 'admin.reports.views.game.roundDetail' : 'admin.reports.views.game.drawDetail'),
    subtitle: rounds?.truncated ? t('admin.reports.views.game.roundsTruncated', { count: formatCount(items.length) }) : undefined,
    content: [
      {
        type: 'table',
        columns,
        rows: items.map((r: ReportRound) => ({
          key: r.id,
          cells: {
            id: r.code,
            at: r.at,
            result: { value: r.result, strong: true },
            origin: { value: r.manual ? manual : automatic, tag: r.manual ? 'manual' : 'plain' },
            user: r.manual ? r.user : null,
            tickets: r.tickets,
            amount: r.amount,
            prizes: r.prizes,
            balance: r.amount - r.prizes,
          },
        })),
        pageSize: DETAIL_PAGE_SIZE,
        emptyText: t('admin.reports.views.game.noRounds'),
      },
    ],
  }
}

function rouletteBlocks(t: TFunction, ctx: BuildContext): DocBlock[] {
  const data = ctx.data.game ?? EMPTY_GAME_DATA
  const frequency = data.rouletteFrequency
  const groups = rouletteGroupSummary(frequency)
  const totalRounds = data.rouletteRounds
  const frequencyPanel: DocPanel = {
    type: 'panel',
    key: 'frequency',
    title: t('admin.reports.views.game.frequencyChart'),
    subtitle: t('admin.reports.views.game.frequencySubtitle', { rounds: formatCount(totalRounds) }),
    content: [
      {
        type: 'barChart',
        categoryLabel: t('admin.reports.views.game.number'),
        categories: frequency.map((f) => f.slot),
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
    betTypesPanel(t, betTypesOf(data.betTypes, 'roulette')),
    { type: 'row', panels: [frequencyPanel, groupsPanel] },
    roundDetailPanel(t, ctx.data.rounds?.roulette, 'roulette'),
  ]
}

function quickMoneyBlocks(t: TFunction, ctx: BuildContext): DocBlock[] {
  const data = ctx.data.game ?? EMPTY_GAME_DATA
  // Una columna por posición: primero las del Pick 3 y después las del Pick 4 del mismo sorteo.
  const positions = [
    ...data.digits.pick3.map((counts, p) => ({ key: `p3-${p}`, label: t('admin.reports.views.game.pick3Position', { n: p + 1 }), counts })),
    ...data.digits.pick4.map((counts, p) => ({ key: `p4-${p}`, label: t('admin.reports.views.game.pick4Position', { n: p + 1 }), counts })),
  ]
  const typeLabel = (number: string, code: string) => betTypeLabel(t, { game: 'quickMoney', code, digits: number.length, name: code })
  return [
    betTypesPanel(t, betTypesOf(data.betTypes, 'quickMoney')),
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
                column('types', t('admin.reports.views.game.betType'), 'text'),
                column('bets', t('admin.reports.views.game.betsCount'), 'count'),
                column('amount', t('admin.reports.views.kpi.amountBet'), 'currency'),
              ],
              rows: data.topNumbers.map((r, i) => ({
                key: r.number,
                cells: {
                  rank: String(i + 1),
                  number: { value: r.number, strong: true },
                  types: r.betTypes.map((code) => typeLabel(r.number, code)).join(', '),
                  bets: r.bets,
                  amount: r.amount,
                },
              })),
              emptyText: t('admin.reports.views.game.noBets'),
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
              columns: [column('digit', t('admin.reports.views.game.digit'), 'text'), ...positions.map((position) => column(position.key, position.label, 'count'))],
              rows: Array.from({ length: 10 }, (_, digit) => ({
                key: String(digit),
                cells: { digit: { value: String(digit), strong: true }, ...Object.fromEntries(positions.map((position) => [position.key, position.counts[digit] ?? 0])) },
              })),
            },
          ],
        },
      ],
    },
    roundDetailPanel(t, ctx.data.rounds?.quickMoney, 'quickMoney'),
  ]
}

// Reporte de Juego: qué se apuesta (tipos de apuesta), qué sale (frecuencia) y cómo fue cada
// ronda/sorteo. Con "Todos" solo la tabla por juego (el detalle se ve eligiendo un juego).
export function buildGameDocument(ctx: BuildContext): DocumentBody {
  const { t, game, data } = ctx
  if (game === 'roulette') return { blocks: rouletteBlocks(t, ctx) }
  if (game !== 'all') return { blocks: quickMoneyBlocks(t, ctx) }

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
            rows: totalsByGame(data.activity).map(({ game: g, totals }) => gameRow(g, gameLabel(t, g), totals)),
            footer: [gameRow('total', t('admin.reports.views.common.total'), totalsFor(data.activity, 'all'))],
          },
        ],
      },
    ],
  }
}
