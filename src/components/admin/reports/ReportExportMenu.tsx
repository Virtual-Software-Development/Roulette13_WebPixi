import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClickOutside } from '../../../hooks/useClickOutside'
import { DownloadIcon, ChevronDownIcon } from './icons'
import '../adminSelect.css'
import './reportExportMenu.css'

const EXPORT_FORMATS = ['csv', 'pdf', 'excel'] as const

// Dropdown visual -- sin acción real todavía (pedido explícito del usuario: "dropdown inerte", no
// existe un endpoint que genere el archivo agregado de todo el reporte todavía, a diferencia de la
// descarga por fila de Recent Reports que sí dispara un archivo mock, ver RecentReportsPanel.tsx).
export function ReportExportMenu() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setIsOpen(false))

  return (
    <div className="admin-dropdown admin-report-export-menu" ref={containerRef}>
      <button type="button" className="admin-report-export-trigger" aria-expanded={isOpen} onClick={() => setIsOpen((v) => !v)}>
        <DownloadIcon />
        {t('admin.reports.export')}
        <span className={`admin-select-chevron-wrap${isOpen ? ' admin-select-chevron-wrap--open' : ''}`}>
          <ChevronDownIcon />
        </span>
      </button>

      {isOpen && (
        <div className="admin-dropdown-menu" role="listbox">
          {EXPORT_FORMATS.map((format) => (
            <button key={format} type="button" className="admin-dropdown-option" role="option" aria-selected={false} onClick={() => setIsOpen(false)}>
              {t(`admin.reports.exportFormats.${format}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
