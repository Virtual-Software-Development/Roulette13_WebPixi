import { useTranslation } from 'react-i18next'
import { AdminSelect } from '../AdminSelect'
import {
  REPORT_RANGE_PRESETS,
  formatPeriodRange,
  monthPeriods,
  presetPeriod,
  toIsoDate,
  weekPeriods,
  type ReportPeriodKind,
  type ReportRangePreset,
} from '../../../utils/reportPeriod'
import './reportPeriodField.css'

export interface ReportPeriodSelection {
  rangePreset: ReportRangePreset
  customFrom: string
  customTo: string
  weekIndex: number
  monthIndex: number
}

interface ReportPeriodFieldProps {
  kind: ReportPeriodKind
  now: Date
  value: ReportPeriodSelection
  onChange: (value: ReportPeriodSelection) => void
}

// Selector de período según el tipo de reporte (docs: Resumen = rango libre, por defecto hoy;
// Semanal = semana lun–dom, por defecto la última cerrada; Mensual = mes, por defecto el último
// cerrado). La semana/el mes en curso se pueden elegir y quedan marcados como parciales.
export function ReportPeriodField({ kind, now, value, onChange }: ReportPeriodFieldProps) {
  const { t, i18n } = useTranslation()
  const partial = t('admin.reports.views.period.partial')

  if (kind === 'week') {
    const options = weekPeriods(now).map((p, i) => ({ value: String(i), label: `${formatPeriodRange(p)}${p.partial ? ` ${partial}` : ''}` }))
    return (
      <div className="admin-report-period-field">
        <AdminSelect<string>
          label={t('admin.reports.views.period.week')}
          value={String(value.weekIndex)}
          options={options}
          onChange={(v) => onChange({ ...value, weekIndex: Number(v) })}
        />
      </div>
    )
  }

  if (kind === 'month') {
    const monthFormatter = new Intl.DateTimeFormat(i18n.language.startsWith('es') ? 'es-DO' : 'en-US', { month: 'long', year: 'numeric' })
    const options = monthPeriods(now).map((p, i) => {
      const name = monthFormatter.format(p.start)
      return { value: String(i), label: `${name.charAt(0).toUpperCase()}${name.slice(1)}${p.partial ? ` ${partial}` : ''}` }
    })
    return (
      <div className="admin-report-period-field">
        <AdminSelect<string>
          label={t('admin.reports.views.period.month')}
          value={String(value.monthIndex)}
          options={options}
          onChange={(v) => onChange({ ...value, monthIndex: Number(v) })}
        />
      </div>
    )
  }

  const options = REPORT_RANGE_PRESETS.map((preset) => ({
    value: preset,
    label:
      preset === 'custom'
        ? t('admin.reports.views.period.presets.custom')
        : `${t(`admin.reports.views.period.presets.${preset}`)} · ${formatPeriodRange(presetPeriod(preset, now))}`,
  }))
  const today = toIsoDate(now)

  return (
    <div className="admin-report-period-field" data-custom={value.rangePreset === 'custom'}>
      <AdminSelect<ReportRangePreset>
        label={t('admin.reports.views.period.label')}
        value={value.rangePreset}
        options={options}
        onChange={(preset) => onChange({ ...value, rangePreset: preset })}
      />
      {value.rangePreset === 'custom' && (
        <div className="admin-report-period-custom">
          <label className="admin-report-period-date">
            <span className="admin-select-label">{t('admin.reports.views.period.from')}</span>
            <input
              type="date"
              value={value.customFrom}
              max={today}
              onChange={(e) => e.target.value && onChange({ ...value, customFrom: e.target.value })}
            />
          </label>
          <label className="admin-report-period-date">
            <span className="admin-select-label">{t('admin.reports.views.period.to')}</span>
            <input type="date" value={value.customTo} max={today} onChange={(e) => e.target.value && onChange({ ...value, customTo: e.target.value })} />
          </label>
        </div>
      )}
    </div>
  )
}
