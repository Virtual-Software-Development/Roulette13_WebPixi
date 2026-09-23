import { useTranslation } from 'react-i18next'
import { AdminSelect } from '../AdminSelect'
import { buildMediaUrl } from '../../../utils/media'
import { REPORT_GAME_FILTER_OPTIONS, REPORT_GROUP_BY_OPTIONS, REPORT_TYPE_OPTIONS } from '../../../data/adminReportsMockData'
import type { ReportDateRangePreset, ReportGameFilter, ReportGroupBy, ReportType } from '../../../types/adminReports'
import { ReportDateRangeField } from './ReportDateRangeField'
import './reportFiltersPanel.css'

// Mismo ícono ya usado para "Reset"/"Refresh" en otras partes del Admin (GeneralSettingsTab,
// DatabaseCard, Next Results, ver investigación previa).
const RESET_ICON_URL = buildMediaUrl('Website_svg_icons/39_refresh_white_clean.svg')

interface ReportFiltersPanelProps {
  dateRange: ReportDateRangePreset
  onDateRangeChange: (value: ReportDateRangePreset) => void
  game: ReportGameFilter
  onGameChange: (value: ReportGameFilter) => void
  reportType: ReportType
  onReportTypeChange: (value: ReportType) => void
  groupBy: ReportGroupBy
  onGroupByChange: (value: ReportGroupBy) => void
  onApply: () => void
  onReset: () => void
}

export function ReportFiltersPanel({
  dateRange,
  onDateRangeChange,
  game,
  onGameChange,
  reportType,
  onReportTypeChange,
  groupBy,
  onGroupByChange,
  onApply,
  onReset,
}: ReportFiltersPanelProps) {
  const { t } = useTranslation()

  const gameOptions = REPORT_GAME_FILTER_OPTIONS.map((value) => ({ value, label: t(`admin.reports.filters.gameOptions.${value}`) }))
  const reportTypeOptions = REPORT_TYPE_OPTIONS.map((value) => ({ value, label: t(`admin.reports.types.${value}`) }))
  const groupByOptions = REPORT_GROUP_BY_OPTIONS.map((value) => ({ value, label: t(`admin.reports.filters.groupByOptions.${value}`) }))

  return (
    <section className="admin-panel admin-report-filters">
      <ReportDateRangeField value={dateRange} onChange={onDateRangeChange} />

      <AdminSelect<ReportGameFilter> label={t('admin.reports.filters.game')} value={game} options={gameOptions} onChange={onGameChange} />

      <AdminSelect<ReportType>
        label={t('admin.reports.filters.reportType')}
        value={reportType}
        options={reportTypeOptions}
        onChange={onReportTypeChange}
      />

      <AdminSelect<ReportGroupBy> label={t('admin.reports.filters.groupBy')} value={groupBy} options={groupByOptions} onChange={onGroupByChange} />

      <div className="admin-report-filters-actions">
        <button type="button" className="admin-report-filters-btn admin-report-filters-btn--primary" onClick={onApply}>
          {t('admin.reports.filters.apply')}
        </button>
        <button type="button" className="admin-report-filters-btn admin-report-filters-btn--ghost" onClick={onReset}>
          <img src={RESET_ICON_URL} alt="" />
          {t('admin.reports.filters.reset')}
        </button>
      </div>
    </section>
  )
}
