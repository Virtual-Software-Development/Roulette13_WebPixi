import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClickOutside } from '../../../hooks/useClickOutside'
import type { RecentReportFormat } from '../../../types/adminReports'
import { DownloadIcon, ChevronDownIcon } from './icons'
import '../adminSelect.css'
import './reportExportMenu.css'

const EXPORT_FORMATS: RecentReportFormat[] = ['csv', 'pdf', 'excel']

// Exporta el reporte que está en pantalla (tipo, período y juego elegidos) en el formato elegido.
// Mientras se genera el archivo el botón queda deshabilitado con "Generando…".
export function ReportExportMenu({ onExport }: { onExport: (format: RecentReportFormat) => Promise<void> }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setIsOpen(false))

  const handleExport = (format: RecentReportFormat) => {
    setIsOpen(false)
    setIsBusy(true)
    // Promise.resolve().then: si onExport falla antes de devolver la promesa, igual cae en el catch.
    Promise.resolve()
      .then(() => onExport(format))
      .catch((error) => {
        console.error(error)
        window.alert(t('admin.reports.document.exportError'))
      })
      .finally(() => setIsBusy(false))
  }

  return (
    <div className="admin-dropdown admin-report-export-menu" ref={containerRef}>
      <button type="button" className="admin-report-export-trigger" aria-expanded={isOpen} aria-busy={isBusy} disabled={isBusy} onClick={() => setIsOpen((v) => !v)}>
        <DownloadIcon />
        {isBusy ? t('admin.reports.document.generating') : t('admin.reports.export')}
        <span className={`admin-select-chevron-wrap${isOpen ? ' admin-select-chevron-wrap--open' : ''}`}>
          <ChevronDownIcon />
        </span>
      </button>

      {isOpen && (
        <div className="admin-dropdown-menu" role="listbox">
          {EXPORT_FORMATS.map((format) => (
            <button key={format} type="button" className="admin-dropdown-option" role="option" aria-selected={false} onClick={() => handleExport(format)}>
              {t(`admin.reports.exportFormats.${format}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
