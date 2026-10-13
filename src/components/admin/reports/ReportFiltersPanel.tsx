import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminSelect } from '../AdminSelect'
import { buildMediaUrl } from '../../../utils/media'
import type { ReportPeriodKind } from '../../../utils/reportPeriod'
import { REPORT_GAME_FILTER_OPTIONS, REPORT_TYPE_OPTIONS } from '../../../data/adminReportsMockData'
import type { ReportGameFilter, ReportType } from '../../../types/adminReports'
import { ReportPeriodField, type ReportPeriodSelection } from './ReportPeriodField'
import './reportFiltersPanel.css'

// Mismo ícono ya usado para "Reset"/"Refresh" en otras partes del Admin (AdminSettingsPage,
// DatabaseCard, Next Results, ver investigación previa).
const RESET_ICON_URL = buildMediaUrl('Website_svg_icons/39_refresh_white_clean.svg')

interface ReportFiltersPanelProps {
  periodKind: ReportPeriodKind
  now: Date
  period: ReportPeriodSelection
  onPeriodChange: (value: ReportPeriodSelection) => void
  game: ReportGameFilter
  onGameChange: (value: ReportGameFilter) => void
  // Manual Substitutions solo existe en ruleta: el select queda fijo y deshabilitado.
  gameDisabled?: boolean
  reportType: ReportType
  onReportTypeChange: (value: ReportType) => void
  onReset: () => void
  // Botón Export (ReportExportMenu), en el lugar donde estaba Apply.
  exportMenu: ReactNode
}

export function ReportFiltersPanel({
  periodKind,
  now,
  period,
  onPeriodChange,
  game,
  onGameChange,
  gameDisabled,
  reportType,
  onReportTypeChange,
  onReset,
  exportMenu,
}: ReportFiltersPanelProps) {
  const { t } = useTranslation()

  const gameOptions = REPORT_GAME_FILTER_OPTIONS.map((value) => ({ value, label: t(`admin.reports.filters.gameOptions.${value}`) }))
  const reportTypeOptions = REPORT_TYPE_OPTIONS.map((value) => ({ value, label: t(`admin.reports.types.${value}`) }))

  return (
    <section className="admin-panel admin-report-filters">
      <AdminSelect<ReportType>
        label={t('admin.reports.filters.reportType')}
        value={reportType}
        options={reportTypeOptions}
        onChange={onReportTypeChange}
      />

      <AdminSelect<ReportGameFilter>
        label={t('admin.reports.filters.game')}
        value={game}
        options={gameOptions}
        onChange={onGameChange}
        disabled={gameDisabled}
      />

      <ReportPeriodField kind={periodKind} now={now} value={period} onChange={onPeriodChange} />

      {/* Sin "Apply": cada filtro se aplica apenas cambia; en su lugar va Export. */}
      <div className="admin-report-filters-actions">
        {exportMenu}
        <button type="button" className="admin-report-filters-btn admin-report-filters-btn--ghost" onClick={onReset}>
          <img src={RESET_ICON_URL} alt="" />
          {t('admin.reports.filters.reset')}
        </button>
      </div>
    </section>
  )
}
