import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BetsAndPayoutsChart } from '../components/admin/reports/BetsAndPayoutsChart'
import { PerformanceByGameTable } from '../components/admin/reports/PerformanceByGameTable'
import { RecentReportsPanel } from '../components/admin/reports/RecentReportsPanel'
import { ReportExportMenu } from '../components/admin/reports/ReportExportMenu'
import { ReportFiltersPanel } from '../components/admin/reports/ReportFiltersPanel'
import { ReportMetricCard } from '../components/admin/reports/ReportMetricCard'
import { ReportRtpTrendChart } from '../components/admin/reports/ReportRtpTrendChart'
import { ReportShortcuts } from '../components/admin/reports/ReportShortcuts'
import {
  BETS_AND_PAYOUTS_SERIES,
  BETS_AND_PAYOUTS_Y_MAX,
  BETS_AND_PAYOUTS_Y_TICKS,
  GAME_PERFORMANCE_ROWS,
  GAME_PERFORMANCE_TOTAL,
  RECENT_REPORTS,
  REPORT_KPI_CARDS,
  REPORT_RTP_TREND_SERIES,
  REPORT_SHORTCUTS,
} from '../data/adminReportsMockData'
import { getReportDateRangeLabel } from '../utils/reportDateRange'
import type { RecentReportRow, ReportDateRangePreset, ReportGameFilter, ReportGroupBy, ReportShortcutData, ReportType } from '../types/adminReports'
import './adminReportsPage.css'

const DEFAULT_DATE_RANGE: ReportDateRangePreset = 'thisMonth'
const DEFAULT_GAME: ReportGameFilter = 'all'
const DEFAULT_REPORT_TYPE: ReportType = 'summary'
const DEFAULT_GROUP_BY: ReportGroupBy = 'day'

function formatCreatedAt(date: Date): string {
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${datePart} ${timePart}`
}

// Contenido puro (sin Header/Sidebar propios) -- el shell lo monta AdminPanel.tsx una única vez,
// vía AdminLayout, mismo criterio que AdminDashboardPage.tsx. No existe todavía un
// endpoint/store de reportes (ver adminReportsMockData.ts): todo el estado de acá abajo es local,
// nada de esto refetch datos reales.
export function AdminReportsPage() {
  const { t } = useTranslation()

  const [dateRange, setDateRange] = useState<ReportDateRangePreset>(DEFAULT_DATE_RANGE)
  const [game, setGame] = useState<ReportGameFilter>(DEFAULT_GAME)
  const [reportType, setReportType] = useState<ReportType>(DEFAULT_REPORT_TYPE)
  const [groupBy, setGroupBy] = useState<ReportGroupBy>(DEFAULT_GROUP_BY)
  const [recentReports, setRecentReports] = useState<RecentReportRow[]>(RECENT_REPORTS)

  const handleReset = () => {
    setDateRange(DEFAULT_DATE_RANGE)
    setGame(DEFAULT_GAME)
    setReportType(DEFAULT_REPORT_TYPE)
    setGroupBy(DEFAULT_GROUP_BY)
  }

  // Sin backend que recalcule KPIs/gráficas todavía (ver mock de arriba) -- Apply queda listo para
  // ese día, hoy los selects ya reflejan su valor apenas se eligen.
  const handleApply = () => {}

  const handleShortcutSelect = (shortcut: ReportShortcutData) => {
    setReportType(shortcut.id)
    const newReport: RecentReportRow = {
      // crypto.randomUUID() en vez de Date.now() -- dos shortcuts clickeados en el mismo
      // milisegundo generaban el mismo id, y React colapsaba esas filas por key duplicada (ver
      // conversación: se reprodujo generando 80 filas rápido).
      id: crypto.randomUUID(),
      name: `${t(shortcut.titleKey)} ${t('admin.reports.recent.generatedSuffix')}`,
      type: shortcut.id,
      dateRangeLabel: getReportDateRangeLabel(dateRange),
      generatedBy: 'Admin',
      createdAt: formatCreatedAt(new Date()),
    }
    setRecentReports((current) => [newReport, ...current])
  }

  const handleDeleteReport = (id: string) => {
    setRecentReports((current) => current.filter((report) => report.id !== id))
  }

  const handleRenameReport = (id: string, name: string) => {
    setRecentReports((current) => current.map((report) => (report.id === id ? { ...report, name } : report)))
  }

  return (
    <>
      <div className="admin-main-topbar">
        <div>
          <h1 className="admin-main-title">{t('admin.reports.title')}</h1>
          <p className="admin-main-subtitle">{t('admin.reports.subtitle')}</p>
        </div>
        <ReportExportMenu />
      </div>

      <ReportFiltersPanel
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        game={game}
        onGameChange={setGame}
        reportType={reportType}
        onReportTypeChange={setReportType}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        onApply={handleApply}
        onReset={handleReset}
      />

      <div className="admin-reports-kpi-grid">
        {REPORT_KPI_CARDS.map((card) => (
          <ReportMetricCard key={card.id} data={card} />
        ))}
      </div>

      <div className="admin-reports-charts-row">
        <BetsAndPayoutsChart series={BETS_AND_PAYOUTS_SERIES} yMax={BETS_AND_PAYOUTS_Y_MAX} yTicks={BETS_AND_PAYOUTS_Y_TICKS} />
        <ReportRtpTrendChart series={REPORT_RTP_TREND_SERIES} />
      </div>

      <div className="admin-reports-second-row">
        <PerformanceByGameTable rows={GAME_PERFORMANCE_ROWS} total={GAME_PERFORMANCE_TOTAL} />
        <ReportShortcuts shortcuts={REPORT_SHORTCUTS} onSelect={handleShortcutSelect} />
      </div>

      <RecentReportsPanel reports={recentReports} onDelete={handleDeleteReport} onRename={handleRenameReport} />
    </>
  )
}
