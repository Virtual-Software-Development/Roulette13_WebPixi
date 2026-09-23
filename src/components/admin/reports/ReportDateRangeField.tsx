import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClickOutside } from '../../../hooks/useClickOutside'
import { buildMediaUrl } from '../../../utils/media'
import { getReportDateRangeLabel } from '../../../utils/reportDateRange'
import { REPORT_DATE_RANGE_OPTIONS } from '../../../data/adminReportsMockData'
import type { ReportDateRangePreset } from '../../../types/adminReports'
import { ChevronDownIcon } from './icons'
import '../adminSelect.css'
import './reportDateRangeField.css'

const CALENDAR_ICON_URL = buildMediaUrl('Website_svg_icons/33_calendar_white.svg')

interface ReportDateRangeFieldProps {
  value: ReportDateRangePreset
  onChange: (value: ReportDateRangePreset) => void
}

// Mismo patrón botón+menú que DateRangeControl (../DateRangeControl.tsx) -- namespace propio
// (mismo criterio que el resto del Admin) porque acá el valor mostrado es un rango de fechas
// formateado, no una sola opción. Sin lógica de calendario real detrás (el proyecto no tiene
// ninguna, ver investigación previa): el día que exista un rango real, este mismo estado es el
// que hay que levantar.
export function ReportDateRangeField({ value, onChange }: ReportDateRangeFieldProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setIsOpen(false))

  return (
    <div className="admin-report-date-range-field">
      <span className="admin-select-label">{t('admin.reports.filters.dateRange')}</span>
      <div className="admin-dropdown" ref={containerRef}>
        <button type="button" className="admin-report-date-range-trigger" aria-expanded={isOpen} onClick={() => setIsOpen((v) => !v)}>
          <img src={CALENDAR_ICON_URL} className="admin-report-date-range-icon" alt="" />
          <span className="admin-report-date-range-value">{getReportDateRangeLabel(value)}</span>
          <span className={`admin-select-chevron-wrap${isOpen ? ' admin-select-chevron-wrap--open' : ''}`}>
            <ChevronDownIcon />
          </span>
        </button>

        {isOpen && (
          <div className="admin-dropdown-menu" role="listbox">
            {REPORT_DATE_RANGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className="admin-dropdown-option"
                data-selected={option === value}
                role="option"
                aria-selected={option === value}
                onClick={() => {
                  onChange(option)
                  setIsOpen(false)
                }}
              >
                {t(`admin.reports.filters.dateRangeOptions.${option}`)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
