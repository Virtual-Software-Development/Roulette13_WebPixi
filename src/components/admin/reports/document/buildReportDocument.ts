import type { TFunction } from 'i18next'
import { REPORT_GAMES } from '../../../../api/adminReports'
import type { ReportData, ReportGameFilter, ReportType } from '../../../../types/adminReports'
import { REPORT_TIME_ZONE, reportCurrencyCode } from '../../../../utils/reportFormat'
import { comparisonPeriod, formatPeriodRange, type ReportPeriod, type ReportPeriodKind } from '../../../../utils/reportPeriod'
import { buildFinancialDocument } from './buildFinancialDocument'
import { buildGameDocument } from './buildGameDocument'
import { buildRtpDocument } from './buildRtpDocument'
import { buildSalesActivityDocument } from './buildSalesActivityDocument'
import { buildSubstitutionsDocument } from './buildSubstitutionsDocument'
import { buildSummaryDocument } from './buildSummaryDocument'
import { gameLabel, type BuildContext, type DocumentBody } from './documentHelpers'
import { buildManualSubstitutionsReport } from './reportData'
import type { DocBlock, DocPanel, ReportDocument } from './reportDocument'

export interface ReportRequest {
  type: ReportType
  period: ReportPeriod
  kind: ReportPeriodKind
  game: ReportGameFilter
  now: Date
  generatedBy: string
  // Ya formateado (dd/mm/aaaa hh:mm).
  generatedAt: string
  // Con "Todos los juegos", además del combinado va el reporte completo de cada juego, cada uno en
  // su propia sección.
  byGame?: boolean
  // Datos del backend para este pedido (api/adminReports.ts > fetchReportData, con el mismo byGame).
  data: ReportData
}

export const periodKindOf = (type: ReportType): ReportPeriodKind => (type === 'weeklyReport' ? 'week' : type === 'monthlyReport' ? 'month' : 'range')

export const localeOf = (language: string) => (language.startsWith('es') ? 'es-DO' : 'en-US')

function buildBody(type: ReportType, ctx: BuildContext): DocumentBody {
  switch (type) {
    case 'summary':
    case 'weeklyReport':
    case 'monthlyReport':
      return buildSummaryDocument(ctx)
    case 'gameReport':
      return buildGameDocument(ctx)
    case 'salesActivity':
      return buildSalesActivityDocument(ctx)
    case 'financialReport':
      return buildFinancialDocument(ctx)
    case 'rtpAnalysis':
      return buildRtpDocument(ctx)
    case 'manualSubstitutions':
      return buildSubstitutionsDocument(
        ctx,
        buildManualSubstitutionsReport({
          period: ctx.period,
          previousPeriod: comparisonPeriod(ctx.period, 'range'),
          filter: ctx.game,
          activity: ctx.data.activity,
          substitutions: ctx.data.substitutions ?? [],
          previousActivity: ctx.data.previousActivity ?? { days: [], hours: [] },
          previousSubstitutions: ctx.data.previousSubstitutions ?? [],
        }),
      )
  }
}

// Las claves de panel identifican las gráficas al exportar: con varias secciones se repetirían.
function withKeyPrefix(blocks: DocBlock[], prefix: string): DocBlock[] {
  const panel = (p: DocPanel): DocPanel => ({ ...p, key: `${prefix}.${p.key}` })
  return blocks.map((block) => (block.type === 'panel' ? panel(block) : block.type === 'row' ? { ...block, panels: block.panels.map(panel) } : block))
}

// Combinado de todos los juegos y después cada juego completo, cada parte en su sección.
function byGameBlocks(type: ReportType, ctx: BuildContext, combined: DocBlock[]): DocBlock[] {
  const d = (key: string, options?: Record<string, string>) => ctx.t(`admin.reports.document.${key}`, options)
  return [
    { type: 'section', key: 'all', title: d('allGamesSection'), short: d('allGamesShort') },
    ...combined,
    ...REPORT_GAMES.flatMap((game): DocBlock[] => [
      { type: 'section', key: game, title: d('gameSection', { game: gameLabel(ctx.t, game) }), short: gameLabel(ctx.t, game) },
      ...withKeyPrefix(buildBody(type, { ...ctx, game }).blocks, game),
    ]),
  ]
}

// Arma el documento de un reporte (archivos).
export function buildReportDocument(request: ReportRequest, t: TFunction, language: string): ReportDocument {
  const { type, period, kind, now, game, data } = request
  const splitByGame = !!request.byGame && game === 'all'
  const ctx: BuildContext = { t, locale: localeOf(language), period, kind, game, now, byGame: splitByGame, data }
  const body = buildBody(type, ctx)

  const d = (key: string) => t(`admin.reports.document.${key}`)
  const periodText = `${formatPeriodRange(period)}${period.partial && kind !== 'range' ? ` ${t('admin.reports.views.period.partial')}` : ''}`
  return {
    title: t(`admin.reports.types.${type}`),
    currency: reportCurrencyCode(),
    meta: [
      { label: d('period'), value: periodText },
      { label: d('game'), value: gameLabel(t, game) },
      { label: d('generatedBy'), value: request.generatedBy },
      { label: d('generatedAt'), value: request.generatedAt },
      { label: d('timeZone'), value: REPORT_TIME_ZONE },
    ],
    previousLabel: body.previousLabel,
    labels: {
      indicators: d('indicators'),
      indicator: d('indicator'),
      value: d('value'),
      previous: body.previousLabel ?? d('previousPeriod'),
      change: d('change'),
      summarySheet: d('summarySheet'),
      page: d('page'),
      of: d('of'),
    },
    blocks: splitByGame ? byGameBlocks(type, ctx, body.blocks) : body.blocks,
  }
}
