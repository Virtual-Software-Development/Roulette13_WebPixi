import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useDropdownFlip } from '../../hooks/useDropdownFlip'
import './adminRowActionsMenu.css'

export interface AdminRowAction {
  key: string
  label: string
  icon?: ReactNode
  tone?: 'default' | 'danger'
  onSelect: () => void
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="5.2" r="1.7" fill="currentColor" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" />
      <circle cx="12" cy="18.8" r="1.7" fill="currentColor" />
    </svg>
  )
}

// Genérico -- recibe la lista de acciones YA decidida por quien lo usa (ver
// RouletteVideoLibraryTab.tsx: qué acciones tiene sentido según el status de la fila vive ahí, no
// acá), así que este componente no conoce Roulette/Quick Money/Upload History y no viola "no crear
// una tabla universal". Compuesto a partir de useClickOutside+useDropdownFlip+.admin-dropdown-menu,
// mismo mecanismo que DownloadMenu.tsx (reports/), el único dropdown por-fila que ya existía.
export function AdminRowActionsMenu({ actions }: { actions: AdminRowAction[] }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setIsOpen(false))
  const openUpward = useDropdownFlip(containerRef, isOpen)

  if (actions.length === 0) return null

  return (
    <div className="admin-dropdown admin-row-actions" ref={containerRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="admin-row-actions-trigger"
        aria-expanded={isOpen}
        aria-label={t('admin.videos.shared.rowActions')}
        onClick={() => setIsOpen((v) => !v)}
      >
        <MoreIcon />
      </button>

      {isOpen && (
        <div className={`admin-dropdown-menu admin-row-actions-menu${openUpward ? ' admin-dropdown-menu--up' : ''}`} role="menu">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              className="admin-dropdown-option admin-row-actions-option"
              data-tone={action.tone ?? 'default'}
              onClick={() => {
                action.onSelect()
                setIsOpen(false)
              }}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
