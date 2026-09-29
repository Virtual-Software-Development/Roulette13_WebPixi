import { useRef, useState } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import './adminSelect.css'

export interface AdminSelectOption<T extends string> {
  value: T
  label: string
  icon?: string
}

interface AdminSelectProps<T extends string> {
  value: T
  options: AdminSelectOption<T>[]
  onChange: (value: T) => void
  label?: string
  ariaLabel?: string
  disabled?: boolean
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 8.5 12 15.5 19 8.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Select genérico extraído del patrón botón+menú repetido en DateRangeControl/GamesActivityChart/
// RtpTrendChart (ver investigación previa: el proyecto no tenía ningún <Select> reutilizable) --
// usado por Game/Simulation Type/Volatility Model/Schedule Type en RTP Management.
export function AdminSelect<T extends string>({ value, options, onChange, label, ariaLabel, disabled }: AdminSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setIsOpen(false))

  const selected = options.find((option) => option.value === value)

  return (
    <div className="admin-select-field">
      {label && <span className="admin-select-label">{label}</span>}
      <div className="admin-dropdown admin-select" ref={containerRef}>
        <button
          type="button"
          className="admin-select-trigger"
          aria-expanded={isOpen}
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={() => setIsOpen((v) => !v)}
        >
          {selected?.icon && <img src={selected.icon} className="admin-select-trigger-icon" alt="" />}
          <span className="admin-select-trigger-text">{selected?.label ?? ''}</span>
          <span className={`admin-select-chevron-wrap${isOpen ? ' admin-select-chevron-wrap--open' : ''}`}>
            <ChevronDownIcon />
          </span>
        </button>

        {isOpen && (
          <div className="admin-dropdown-menu" role="listbox">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className="admin-dropdown-option admin-select-option"
                data-selected={option.value === value}
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
              >
                {option.icon && <img src={option.icon} className="admin-select-option-icon" alt="" />}
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
