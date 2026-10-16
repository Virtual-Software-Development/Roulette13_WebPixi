import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { AdminAuthError } from '../api/adminSession'
import type { GamePeriodTotals, RoundSummary } from '../api/adminRounds'
import { AdminStatCard } from '../components/admin/AdminStatCard'
import { DateRangeControl } from '../components/admin/DateRangeControl'
import { GameEventsOverTimeChart } from '../components/admin/GameEventsOverTimeChart'
import { GamePerformanceChart } from '../components/admin/GamePerformanceChart'
import { InfoBanner } from '../components/admin/InfoBanner'
import { RecentRoundsPanel } from '../components/admin/RecentRoundsPanel'
import { ResultFrequencyChart } from '../components/admin/ResultFrequencyChart'
import { ReportMetricCard } from '../components/admin/reports/ReportMetricCard'
import { GAME_LABEL_KEY, RTP_GAMES } from '../data/rtpGameLabels'
import { useDashboardData, useRoundTimeline } from '../hooks/useAdminRounds'
import { formatCurrency } from '../utils/currencyFormat'
import { dashboardDateRangeBounds, type DashboardDateRange } from '../utils/dashboardDateRange'
import { buildMediaUrl } from '../utils/media'
import type { AdminStatCardData, GameEventsOverTimeRange, GamePerformanceRow } from '../types/adminDashboard'
import type { ReportKpiCardData } from '../types/adminReports'
import './adminDashboardPage.css'

const MACHINES_ICON_URL = buildMediaUrl('Website_svg_icons/36_users_green.svg')
const VS_PREVIOUS_KEY = 'admin.reports.kpi.vsPreviousPeriod'

function loadErrorMessage(err: unknown, t: TFunction): string {
  if (err instanceof AdminAuthError) return t('admin.dashboard.loginRequired')
  return t('admin.dashboard.loadError', { error: err instanceof Error && err.message ? err.message : String(err) })
}

// Variación % contra el período anterior; sin dato anterior no hay trend (nunca un número inventado).
function percentTrend(current: number, previous: number): Pick<ReportKpiCardData, 'trend' | 'trendTone' | 'trendLabelKey'> {
  if (previous <= 0) return {}
  const change = ((current - previous) / previous) * 100
  const abs = Math.abs(change)
  return {
    trend: `${change >= 0 ? '+' : '−'}${abs.toFixed(abs < 10 ? 1 : 0)}%`,
    trendTone: change >= 0 ? 'positive' : 'negative',
    trendLabelKey: VS_PREVIOUS_KEY,
  }
}

function buildKpiCards(summary: RoundSummary, language: string): { machines: AdminStatCardData; report: ReportKpiCardData[] } {
  const cur = summary.current.totals
  const prev = summary.previous.totals
  const hasPrevious = prev.rounds > 0
  const machinesDiff = cur.machines - prev.machines
  const rtpTrend: Pick<ReportKpiCardData, 'trend' | 'trendTone' | 'trendLabelKey'> =
    cur.rtp !== null && prev.rtp !== null
      ? {
          trend: `${cur.rtp - prev.rtp >= 0 ? '+' : '−'}${Math.abs(cur.rtp - prev.rtp).toFixed(2)} pp`,
          trendTone: 'accent',
          trendLabelKey: VS_PREVIOUS_KEY,
        }
      : {}

  return {
    machines: {
      id: 'activeMachines',
      titleKey: 'admin.dashboard.kpi.activeMachines',
      value: cur.machines.toLocaleString(language),
      icon: MACHINES_ICON_URL,
      accent: 'yellow',
      ...(hasPrevious && machinesDiff !== 0
        ? { trend: `${machinesDiff > 0 ? '+' : '−'}${Math.abs(machinesDiff)}`, trendDirection: machinesDiff > 0 ? 'up' : 'down', trendLabelKey: VS_PREVIOUS_KEY }
        : {}),
    },
    report: [
      {
        id: 'totalBets',
        titleKey: 'admin.reports.kpi.totalBets',
        value: cur.bets.toLocaleString(language),
        icon: 'bets',
        accent: 'green',
        ...percentTrend(cur.bets, prev.bets),
      },
      {
        id: 'totalPayout',
        titleKey: 'admin.reports.kpi.totalPayout',
        value: formatCurrency(cur.paid),
        icon: 'payout',
        accent: 'blue',
        ...percentTrend(cur.paid, prev.paid),
      },
      {
        id: 'grossRevenue',
        titleKey: 'admin.reports.kpi.grossRevenue',
        value: formatCurrency(cur.ggr),
        icon: 'revenue',
        accent: 'purple',
        ...percentTrend(cur.ggr, prev.ggr),
      },
      {
        id: 'rtp',
        titleKey: 'admin.reports.kpi.rtp',
        value: cur.rtp === null ? '—' : `${cur.rtp.toFixed(2)}%`,
        icon: 'rtp',
        accent: 'red',
        ...rtpTrend,
      },
    ],
  }
}

function performanceRows(summary: RoundSummary): GamePerformanceRow[] {
  return RTP_GAMES.map((game) => {
    const totals: GamePeriodTotals | undefined = summary.current.byGame[game]
    return { id: game, labelKey: GAME_LABEL_KEY[game], wagers: totals?.wagered ?? 0, payouts: totals?.paid ?? 0, ggr: totals?.ggr ?? 0 }
  })
}

// Contenido puro (sin Header/Sidebar propios) -- el shell lo monta AdminPanel.tsx una única vez,
// vía AdminLayout, y solo intercambia qué página se renderiza acá adentro. Datos de
// quick-money-backend (internal/roundstats): toda cifra de apuestas/montos sale solo de rondas ya
// sorteadas (COMPLETED), nunca de la ronda abierta.
export function AdminDashboardPage() {
  const { t, i18n } = useTranslation()
  const [dateRange, setDateRange] = useState<DashboardDateRange>('last7Days')
  const [timelineRange, setTimelineRange] = useState<GameEventsOverTimeRange>('24h')
  // Los límites se recalculan solo al cambiar el rango (no en cada render).
  const { from, to } = useMemo(() => dashboardDateRangeBounds(dateRange, new Date()), [dateRange])

  const dashboard = useDashboardData(from, to)
  const timeline = useRoundTimeline(timelineRange)
  const data = dashboard.data
  const cards = useMemo(() => (data ? buildKpiCards(data.summary, i18n.language) : null), [data, i18n.language])

  const errors = [dashboard, timeline].filter((load) => load.status === 'error')

  return (
    <>
      <div className="admin-main-topbar">
        <div>
          <h1 className="admin-main-title">{t('admin.dashboard.title')}</h1>
          <p className="admin-main-subtitle">{t('admin.dashboard.subtitle')}</p>
        </div>
        <DateRangeControl value={dateRange} onChange={setDateRange} />
      </div>

      {errors.length > 0 && (
        <div className="admin-dashboard-state">
          <InfoBanner variant="warning" title={loadErrorMessage(errors[0].error, t)} />
          <button
            type="button"
            className="admin-dashboard-retry-btn"
            onClick={() => {
              for (const load of errors) load.reload()
            }}
          >
            {t('admin.dashboard.retry')}
          </button>
        </div>
      )}

      {!data || !cards ? (
        dashboard.status === 'loading' && <p className="admin-dashboard-state-text">{t('admin.dashboard.loading')}</p>
      ) : (
        <>
          <div className="admin-kpi-grid" aria-busy={dashboard.status === 'loading'}>
            <AdminStatCard data={cards.machines} />
            {cards.report.map((card) => (
              <ReportMetricCard key={card.id} data={card} />
            ))}
          </div>

          <div className="admin-charts-row">
            <GamePerformanceChart rows={performanceRows(data.summary)} />
            {/* Columna derecha: Result Frequency arriba de Recent Rounds -- ambos hablan de
                resultados ya sorteados, uno agregado y otro ronda por ronda. */}
            <div className="admin-dashboard-side-column">
              <ResultFrequencyChart dataByGame={data.resultFrequency} />
              <RecentRoundsPanel rounds={data.recentRounds} />
            </div>
            <GameEventsOverTimeChart
              series={timeline.data?.points ?? []}
              bucket={timeline.data?.bucket ?? (timelineRange === '24h' ? 'hour' : 'day')}
              range={timelineRange}
              onRangeChange={setTimelineRange}
            />
          </div>
        </>
      )}
    </>
  )
}
