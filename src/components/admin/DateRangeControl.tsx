import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClickOutside } from '../../hooks/useClickOutside'
import { buildMediaUrl } from '../../utils/media'
import { DASHBOARD_DATE_RANGES, type DashboardDateRange } from '../../utils/dashboardDateRange'
import './dateRangeControl.css'

const CALENDAR_ICON_URL = buildMediaUrl('Website_svg_icons/33_calendar_white.svg')

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="admin-date-range-chevron" aria-hidden="true" focusable="false">
      <path d="M5 8.5 12 15.5 19 8.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Período del Dashboard (ver dashboardDateRangeBounds) -- controlado: el estado vive en la página.
export function DateRangeControl({ value: selected, onChange }: { value: DashboardDateRange; onChange: (value: DashboardDateRange) => void }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useClickOutside(containerRef, () => setIsOpen(false))

  return (
    <div className="admin-dropdown" ref={containerRef}>
      <button type="button" className="admin-date-range" aria-expanded={isOpen} onClick={() => setIsOpen((value) => !value)}>
        <img src={CALENDAR_ICON_URL} className="admin-date-range-icon" alt="" />
        <span className="admin-date-range-text">
          <span className="admin-date-range-label">{t('admin.dashboard.dateRange')}</span>
          <span className="admin-date-range-value">{t(`admin.dashboard.dateRangeOptions.${selected}`)}</span>
        </span>
        <span className={`admin-date-range-chevron-wrap${isOpen ? ' admin-date-range-chevron-wrap--open' : ''}`}>
          <ChevronDownIcon />
        </span>
      </button>

      {isOpen && (
        <div className="admin-dropdown-menu" role="listbox">
          {DASHBOARD_DATE_RANGES.map((option) => (
            <button
              key={option}
              type="button"
              className="admin-dropdown-option"
              data-selected={option === selected}
              role="option"
              aria-selected={option === selected}
              onClick={() => {
                onChange(option)
                setIsOpen(false)
              }}
            >
              {t(`admin.dashboard.dateRangeOptions.${option}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
