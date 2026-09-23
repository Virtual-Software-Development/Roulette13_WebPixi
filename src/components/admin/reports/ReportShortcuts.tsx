import { useTranslation } from 'react-i18next'
import type { ReportShortcutData } from '../../../types/adminReports'
import { ChevronRightIcon } from './icons'
import './reportShortcuts.css'

interface ReportShortcutsProps {
  shortcuts: ReportShortcutData[]
  onSelect: (shortcut: ReportShortcutData) => void
}

// Cada shortcut fija el Report Type del filtro y agrega una fila "recién generada" a Recent
// Reports (ver AdminReportsPage.tsx) -- no navega a ninguna página nueva, no existe una vista de
// detalle por tipo de reporte todavía (pedido explícito del usuario, ver conversación).
export function ReportShortcuts({ shortcuts, onSelect }: ReportShortcutsProps) {
  const { t } = useTranslation()

  return (
    <section className="admin-panel admin-report-shortcuts">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">{t('admin.reports.shortcuts.title')}</h2>
      </div>

      <div className="admin-report-shortcuts-grid">
        {shortcuts.map((shortcut) => (
          <button key={shortcut.id} type="button" className="admin-report-shortcut" onClick={() => onSelect(shortcut)}>
            <img src={shortcut.icon} className="admin-report-shortcut-icon" alt="" />
            <span className="admin-report-shortcut-body">
              <span className="admin-report-shortcut-title">{t(shortcut.titleKey)}</span>
              <span className="admin-report-shortcut-description">{t(shortcut.descriptionKey)}</span>
            </span>
            <span className="admin-report-shortcut-chevron">
              <ChevronRightIcon />
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
