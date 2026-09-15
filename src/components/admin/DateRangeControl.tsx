import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClickOutside } from '../../hooks/useClickOutside'
import { buildMediaUrl } from '../../utils/media'
import './dateRangeControl.css'

const CALENDAR_ICON_URL = buildMediaUrl('Website_svg_icons/33_calendar_white.svg')

const DATE_RANGE_OPTIONS = ['today', 'yesterday', 'last7Days', 'last30Days', 'thisMonth'] as const

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="admin-date-range-chevron" aria-hidden="true" focusable="false">
      <path d="M5 8.5 12 15.5 19 8.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Dropdown funcional -- sin lógica de calendario real detrás todavía (el proyecto no tiene
// ninguna, ver investigación previa), solo guarda la opción elegida en estado local. El día que
// exista un rango real que filtre los datos del dashboard, este mismo estado es el que hay que
// levantar y pasarle a los paneles.
export function DateRangeControl() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<(typeof DATE_RANGE_OPTIONS)[number]>('today')
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
          {DATE_RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className="admin-dropdown-option"
              data-selected={option === selected}
              role="option"
              aria-selected={option === selected}
              onClick={() => {
                setSelected(option)
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
