import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { gamesOf } from '../api/adminReports'
import { InfoBanner } from '../components/admin/InfoBanner'
import { BetsAndPayoutsChart } from '../components/admin/reports/BetsAndPayoutsChart'
import { periodKindOf } from '../components/admin/reports/document/buildReportDocument'
import { balanceOf, dailyTargets, rtpOf, totalsByDay, totalsByGame, weekdayHourActivity } from '../components/admin/reports/document/reportData'
import { downloadRecentReport } from '../components/admin/reports/export/downloadReport'
import { PeakHoursHeatmap } from '../components/admin/reports/PeakHoursHeatmap'
import { PerformanceByGameTable } from '../components/admin/reports/PerformanceByGameTable'
import { RecentReportsPanel } from '../components/admin/reports/RecentReportsPanel'
import { ReportExportMenu } from '../components/admin/reports/ReportExportMenu'
import { ReportFiltersPanel } from '../components/admin/reports/ReportFiltersPanel'
import type { ReportPeriodSelection } from '../components/admin/reports/ReportPeriodField'
import { ReportRtpTrendChart } from '../components/admin/reports/ReportRtpTrendChart'
import { ReportShortcuts } from '../components/admin/reports/ReportShortcuts'
import { REPORT_SHORTCUTS } from '../data/adminReportsConfig'
import { describeReportError, useReportScreenData, type ReportScreenData } from '../hooks/useAdminReports'
import type {
  BetsPayoutsPoint,
  GamePerformanceRow,
  RecentReportFormat,
  RecentReportRow,
  ReportGameFilter,
  ReportRtpTrendPoint,
  ReportShortcutData,
  ReportType,
} from '../types/adminReports'
import { formatDateTime, reportNow } from '../utils/reportFormat'
import {
  customPeriod,
  formatPeriodRange,
  fromIsoDate,
  monthPeriods,
  presetPeriod,
  toIsoDate,
  weekPeriods,
  type ReportPeriod,
  type ReportPeriodKind,
} from '../utils/reportPeriod'
import './adminReportsPage.css'

const DEFAULT_GAME: ReportGameFilter = 'all'
const DEFAULT_REPORT_TYPE: ReportType = 'summary'
// Semanal/Mensual: índice 1 = última semana/mes cerrado (0 = en curso, parcial).
const LAST_CLOSED_INDEX = 1

// Los rangos arrancan en "Last 7 days".
function defaultPeriodSelection(now: Date): ReportPeriodSelection {
  const today = toIsoDate(now)
  return { rangePreset: 'last7Days', customFrom: today, customTo: today, weekIndex: LAST_CLOSED_INDEX, monthIndex: LAST_CLOSED_INDEX }
}

function resolvePeriod(kind: ReportPeriodKind, selection: ReportPeriodSelection, now: Date): ReportPeriod {
  if (kind === 'week') return weekPeriods(now)[selection.weekIndex]
  if (kind === 'month') return monthPeriods(now)[selection.monthIndex]
  if (selection.rangePreset !== 'custom') return presetPeriod(selection.rangePreset, now)
  return customPeriod(fromIsoDate(selection.customFrom) ?? now, fromIsoDate(selection.customTo) ?? now, now)
}

// Datos de la pantalla para el período y juego elegidos (mismos agregados que los archivos):
// - Bets, Payouts & Revenue y RTP Trend: un punto por día. El objetivo de RTP es el de cada juego
//   (RTP Management); "All games" no tiene uno.
// - Peak Hours: ventas y tickets por día de la semana y hora.
// - Performance by Game: una fila por juego del filtro.
function screenData(data: ReportScreenData, period: ReportPeriod, game: ReportGameFilter, language: string) {
  const dayLabel = new Intl.DateTimeFormat(language.startsWith('es') ? 'es' : 'en-US', { month: 'short', day: 'numeric' })
  const days = totalsByDay(data.activity, period, game)
  const bets: BetsPayoutsPoint[] = days.map(({ date, totals }) => ({ label: dayLabel.format(date), bets: totals.sales, payout: totals.prizes }))
  const targets = game === 'all' ? null : dailyTargets(data.rtp, period, game)
  const rtp: ReportRtpTrendPoint[] = days.map(({ date, totals }, i) => ({
    label: dayLabel.format(date),
    rtp: rtpOf(totals),
    target: targets?.[i] ?? null,
  }))
  const games = gamesOf(game)
  const performance: GamePerformanceRow[] = totalsByGame(data.activity)
    .filter((row) => games.includes(row.game))
    .map(({ game: id, totals }) => ({ id, totalBets: totals.bets, totalPayout: totals.prizes, grossRevenue: balanceOf(totals), rtp: rtpOf(totals) }))
  const performanceTotal = performance.reduce(
    (sum, row) => ({ totalBets: sum.totalBets + row.totalBets, totalPayout: sum.totalPayout + row.totalPayout, grossRevenue: sum.grossRevenue + row.grossRevenue }),
    { totalBets: 0, totalPayout: 0, grossRevenue: 0 },
  )
  return { bets, rtp, peakHours: weekdayHourActivity(data.activity, game), performance, performanceTotal }
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

// Id único de un reporte generado. crypto.randomUUID() solo existe en contexto seguro (https o
// localhost): entrando por la IP de la red (http://10.0.0.x) no está, y la exportación fallaba
// dejando el botón en "Generando…".
function newReportId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
}

const EMPTY_SCREEN_DATA: ReportScreenData = { activity: { days: [], hours: [] }, rtp: { games: [], targets: [], changes: [] } }

// Contenido puro (sin Header/Sidebar propios) -- el shell lo monta AdminPanel.tsx una única vez,
// vía AdminLayout, mismo criterio que AdminDashboardPage.tsx. Los datos vienen de
// quick-money-backend (GET /reports/*); Recent Reports es local a la sesión (el archivo no se
// guarda en el backend). La pantalla es la misma para todos los tipos de reporte (gráficas y tabla
// por juego del período y juego elegidos); el detalle de cada tipo va en el archivo descargado.
export function AdminReportsPage() {
  const { t, i18n } = useTranslation()

  // "Ahora" en hora de Santo Domingo, fijado al abrir la página: los datos no se mueven mientras
  // se navega entre reportes.
  const [now] = useState(() => reportNow())
  const [periodSelection, setPeriodSelection] = useState<ReportPeriodSelection>(() => defaultPeriodSelection(now))
  const [game, setGame] = useState<ReportGameFilter>(DEFAULT_GAME)
  const [reportType, setReportType] = useState<ReportType>(DEFAULT_REPORT_TYPE)
  const [recentReports, setRecentReports] = useState<RecentReportRow[]>([])
  const [shortcutFormat, setShortcutFormat] = useState<RecentReportFormat>('csv')

  const periodKind = periodKindOf(reportType)
  const period = useMemo(() => resolvePeriod(periodKind, periodSelection, now), [periodKind, periodSelection, now])
  const screen = useReportScreenData(period)
  const data = useMemo(() => screenData(screen.data ?? EMPTY_SCREEN_DATA, period, game, i18n.language), [screen.data, period, game, i18n.language])

  const handleReset = () => {
    setPeriodSelection(defaultPeriodSelection(now))
    setGame(DEFAULT_GAME)
    setReportType(DEFAULT_REPORT_TYPE)
  }

  // Genera el reporte (lo agrega a Reportes Recientes) y descarga el archivo en el formato elegido.
  // async: cualquier error llega como rechazo de la promesa (y el botón sale de "Generando…").
  const generateReport = async (type: ReportType, title: string, reportPeriod: ReportPeriod, reportGame: ReportGameFilter, format: RecentReportFormat) => {
    const generatedAt = new Date()
    const newReport: RecentReportRow = {
      // Id aleatorio en vez de Date.now() -- dos shortcuts clickeados en el mismo milisegundo
      // generaban el mismo id, y React colapsaba esas filas por key duplicada (ver conversación:
      // se reprodujo generando 80 filas rápido).
      id: newReportId(),
      name: `${buildReportName(title, t('admin.reports.recent.generatedSuffix'))}_${formatReportTimestamp(generatedAt)}`,
      type,
      dateRangeLabel: formatPeriodRange(reportPeriod),
      generatedBy: 'Admin',
      createdAt: formatDateTime(reportNow(generatedAt)),
      period: { start: toIsoDate(reportPeriod.start), end: toIsoDate(reportPeriod.end) },
      game: reportGame,
    }
    setRecentReports((current) => [newReport, ...current])
    return downloadRecentReport(newReport, format, t, i18n.language)
  }

  const handleShortcutSelect = (shortcut: ReportShortcutData) => {
    // Semanal/Mensual abren en la última semana/mes cerrado; el resto respeta el período actual.
    const selection =
      shortcut.id === 'weeklyReport'
        ? { ...periodSelection, weekIndex: LAST_CLOSED_INDEX }
        : shortcut.id === 'monthlyReport'
          ? { ...periodSelection, monthIndex: LAST_CLOSED_INDEX }
          : periodSelection
    setReportType(shortcut.id)
    setPeriodSelection(selection)
    // Los shortcuts generan Y descargan el reporte al instante, en el formato elegido en el selector
    // del panel Report Shortcuts (shortcutFormat).
    generateReport(shortcut.id, t(shortcut.titleKey), resolvePeriod(periodKindOf(shortcut.id), selection, now), game, shortcutFormat).catch((error) => {
      console.error(error)
      window.alert(`${t('admin.reports.document.exportError')}\n\n${describeReportError(error, t)}`)
    })
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
      </div>

      <ReportFiltersPanel
        periodKind={periodKind}
        now={now}
        period={periodSelection}
        onPeriodChange={setPeriodSelection}
        game={game}
        onGameChange={setGame}
        reportType={reportType}
        onReportTypeChange={setReportType}
        onReset={handleReset}
        exportMenu={<ReportExportMenu onExport={(format) => generateReport(reportType, t(`admin.reports.types.${reportType}`), period, game, format)} />}
      />

      {screen.status === 'error' && (
        <div className="admin-reports-state">
          <InfoBanner variant="warning" title={t('admin.reports.errors.title')} description={describeReportError(screen.error, t)} />
          <button type="button" className="admin-report-filters-btn admin-report-filters-btn--ghost" onClick={screen.reload}>
            {t('admin.reports.errors.retry')}
          </button>
        </div>
      )}
      {screen.status === 'loading' && screen.data === null && <p className="admin-reports-state-text">{t('admin.reports.loading')}</p>}

      <div className="admin-reports-charts-row">
        <BetsAndPayoutsChart series={data.bets} />
        {/* RTP Trend + Peak Hours apilados en la columna derecha (antes RTP Trend solo, estirado al
            alto del chart de la izquierda con espacio vacío abajo). */}
        <div className="admin-reports-side-stack">
          <ReportRtpTrendChart series={data.rtp} />
          <PeakHoursHeatmap values={data.peakHours.sales} tickets={data.peakHours.tickets} periodLabel={formatPeriodRange(period)} />
        </div>
      </div>

      <div className="admin-reports-second-row">
        <PerformanceByGameTable rows={data.performance} total={data.performanceTotal} />
        <ReportShortcuts shortcuts={REPORT_SHORTCUTS} format={shortcutFormat} onFormatChange={setShortcutFormat} onSelect={handleShortcutSelect} />
      </div>

      <RecentReportsPanel reports={recentReports} onDelete={handleDeleteReport} onRename={handleRenameReport} />
    </>
  )
}
