import { useTranslation } from 'react-i18next'
import type { RecentReportFormat, ReportShortcutData } from '../../../types/adminReports'
import { DownloadIcon } from './icons'
import './reportShortcuts.css'

const FORMAT_OPTIONS: RecentReportFormat[] = ['csv', 'pdf', 'excel']

interface ReportShortcutsProps {
  shortcuts: ReportShortcutData[]
  // Formato en el que descargan TODOS los shortcuts -- se elige con el selector de la esquina
  // superior derecha del panel (estado en AdminReportsPage, que es quien descarga).
  format: RecentReportFormat
  onFormatChange: (format: RecentReportFormat) => void
  onSelect: (shortcut: ReportShortcutData) => void
}

// Cada shortcut fija el Report Type del filtro, agrega una fila "recién generada" a Recent Reports
// y descarga el archivo al instante en el formato elegido (ver AdminReportsPage.tsx). El ícono de
// descarga a la derecha de cada botón deja claro que el click descarga, no navega.
export function ReportShortcuts({ shortcuts, format, onFormatChange, onSelect }: ReportShortcutsProps) {
  const { t } = useTranslation()
  const formatLabel = t(`admin.reports.exportFormats.${format}`)

  return (
    <section className="admin-panel admin-report-shortcuts">
      <div className="admin-panel-header admin-report-shortcuts-header">
        <div>
          <h2 className="admin-panel-title">{t('admin.reports.shortcuts.title')}</h2>
          <p className="admin-report-shortcuts-hint">{t('admin.reports.shortcuts.downloadHint')}</p>
        </div>
        <div className="admin-report-shortcuts-formats" role="radiogroup" aria-label={t('admin.reports.shortcuts.formatLabel')}>
          {FORMAT_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={option === format}
              className="admin-report-shortcuts-format"
              data-selected={option === format}
              onClick={() => onFormatChange(option)}
            >
              {t(`admin.reports.exportFormats.${option}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-report-shortcuts-grid">
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.id}
            type="button"
            className="admin-report-shortcut"
            title={t('admin.reports.shortcuts.downloadTooltip', { format: formatLabel })}
            onClick={() => onSelect(shortcut)}
          >
            <img src={shortcut.icon} className="admin-report-shortcut-icon" alt="" />
            <span className="admin-report-shortcut-body">
              <span className="admin-report-shortcut-title">{t(shortcut.titleKey)}</span>
              <span className="admin-report-shortcut-description">{t(shortcut.descriptionKey)}</span>
            </span>
            <span className="admin-report-shortcut-download" aria-hidden="true">
              <DownloadIcon />
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
