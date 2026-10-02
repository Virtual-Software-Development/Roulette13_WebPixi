import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BetsAndPayoutsChart } from '../components/admin/reports/BetsAndPayoutsChart'
import { PeakHoursHeatmap } from '../components/admin/reports/PeakHoursHeatmap'
import { downloadMockReport } from '../components/admin/reports/DownloadMenu'
import { PerformanceByGameTable } from '../components/admin/reports/PerformanceByGameTable'
import { RecentReportsPanel } from '../components/admin/reports/RecentReportsPanel'
import { ReportExportMenu } from '../components/admin/reports/ReportExportMenu'
import { ReportFiltersPanel } from '../components/admin/reports/ReportFiltersPanel'
import { ReportRtpTrendChart } from '../components/admin/reports/ReportRtpTrendChart'
import { ReportShortcuts } from '../components/admin/reports/ReportShortcuts'
import {
  BETS_AND_PAYOUTS_SERIES,
  GAME_PERFORMANCE_ROWS,
  GAME_PERFORMANCE_TOTAL,
  PEAK_HOURS_AVERAGE_BET,
  PEAK_HOURS_BETS,
  PEAK_HOURS_GAME_SHARE,
  RECENT_REPORTS,
  REPORT_RTP_TREND_SERIES,
  REPORT_SHORTCUTS,
} from '../data/adminReportsMockData'
import { getReportDateRangeLabel } from '../utils/reportDateRange'
import type { RecentReportFormat, RecentReportRow, ReportDateRangePreset, ReportGameFilter, ReportGroupBy, ReportShortcutData, ReportType } from '../types/adminReports'
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

// "Game Performance" + "Report" -> "Game Performance Report", pero sin duplicar cuando el título ya
// trae la palabra ("Financial Report"/"Weekly Report" quedaban "... Report Report").
function buildReportName(title: string, suffix: string): string {
  return title.toLowerCase().includes(suffix.toLowerCase()) ? title : `${title} ${suffix}`
}

// Sello al final del nombre del reporte generado, ej. "_Oct-01-2026_12h05PM_UTC-4" (hora local del
// navegador, 12h, con su offset UTC para que no sea ambigua entre zonas horarias): el mes en letras
// deja claro que es una fecha y la "h" que es una hora, sin ":" ni "/" (inválidos en un nombre de
// archivo). Offsets no enteros quedan como "UTC+5h30".
const REPORT_STAMP_MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short' })

function formatReportTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const hours12 = date.getHours() % 12 || 12
  const period = date.getHours() < 12 ? 'AM' : 'PM'
  const offsetMinutes = -date.getTimezoneOffset()
  const offsetSign = offsetMinutes >= 0 ? '+' : '-'
  const offsetAbs = Math.abs(offsetMinutes)
  const offset = `UTC${offsetSign}${Math.floor(offsetAbs / 60)}${offsetAbs % 60 ? `h${pad(offsetAbs % 60)}` : ''}`
  return `${REPORT_STAMP_MONTH_FORMATTER.format(date)}-${pad(date.getDate())}-${date.getFullYear()}_${pad(hours12)}h${pad(date.getMinutes())}${period}_${offset}`
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
  const [shortcutFormat, setShortcutFormat] = useState<RecentReportFormat>('csv')

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
    const reportDateRange = shortcut.dateRange ?? dateRange
    if (shortcut.dateRange) setDateRange(shortcut.dateRange)
    if (shortcut.groupBy) setGroupBy(shortcut.groupBy)
    const generatedAt = new Date()
    const newReport: RecentReportRow = {
      // crypto.randomUUID() en vez de Date.now() -- dos shortcuts clickeados en el mismo
      // milisegundo generaban el mismo id, y React colapsaba esas filas por key duplicada (ver
      // conversación: se reprodujo generando 80 filas rápido).
      id: crypto.randomUUID(),
      name: `${buildReportName(t(shortcut.titleKey), t('admin.reports.recent.generatedSuffix'))}_${formatReportTimestamp(generatedAt)}`,
      type: shortcut.id,
      dateRangeLabel: getReportDateRangeLabel(reportDateRange),
      generatedBy: 'Admin',
      createdAt: formatCreatedAt(generatedAt),
    }
    setRecentReports((current) => [newReport, ...current])
    // Los shortcuts generan Y descargan el reporte al instante, en el formato elegido en el selector
    // del panel Report Shortcuts (shortcutFormat) -- antes solo agregaban la fila a Recent Reports y
    // había que descargarla desde ahí.
    downloadMockReport(newReport, shortcutFormat)
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

      <div className="admin-reports-charts-row">
        <BetsAndPayoutsChart series={BETS_AND_PAYOUTS_SERIES} />
        {/* RTP Trend + Peak Hours apilados en la columna derecha (antes RTP Trend solo, estirado al
            alto del chart de la izquierda con espacio vacío abajo). */}
        <div className="admin-reports-side-stack">
          <ReportRtpTrendChart series={REPORT_RTP_TREND_SERIES} />
          <PeakHoursHeatmap
            values={PEAK_HOURS_BETS.map((row) => row.map((v) => Math.round(v * PEAK_HOURS_GAME_SHARE[game])))}
            averageBet={PEAK_HOURS_AVERAGE_BET}
            periodLabel={getReportDateRangeLabel(dateRange)}
          />
        </div>
      </div>

      <div className="admin-reports-second-row">
        <PerformanceByGameTable rows={GAME_PERFORMANCE_ROWS} total={GAME_PERFORMANCE_TOTAL} />
        <ReportShortcuts shortcuts={REPORT_SHORTCUTS} format={shortcutFormat} onFormatChange={setShortcutFormat} onSelect={handleShortcutSelect} />
      </div>

      <RecentReportsPanel reports={recentReports} onDelete={handleDeleteReport} onRename={handleRenameReport} />
    </>
  )
}
