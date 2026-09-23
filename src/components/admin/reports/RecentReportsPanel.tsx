import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClickOutside } from '../../../hooks/useClickOutside'
import { useDropdownFlip } from '../../../hooks/useDropdownFlip'
import { Tooltip } from '../Tooltip'
import type { RecentReportRow } from '../../../types/adminReports'
import { AllReportsModal } from './AllReportsModal'
import { DownloadMenu } from './DownloadMenu'
import { ReportDetailsModal } from './ReportDetailsModal'
import { EyeIcon, MoreIcon, PencilIcon, TrashIcon } from './icons'
import './recentReportsPanel.css'

interface RowActionsMenuProps {
  report: RecentReportRow
  onDelete: (id: string) => void
  onViewDetails: (report: RecentReportRow) => void
  onStartRename: (report: RecentReportRow) => void
}

function RowActionsMenu({ report, onDelete, onViewDetails, onStartRename }: RowActionsMenuProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setIsOpen(false))
  const openUpward = useDropdownFlip(containerRef, isOpen)

  return (
    <div className="admin-dropdown admin-recent-reports-action-dropdown" ref={containerRef}>
      <Tooltip content={t('admin.reports.recent.more')}>
        <button
          type="button"
          className="admin-recent-reports-icon-btn"
          aria-expanded={isOpen}
          aria-label={t('admin.reports.recent.more')}
          onClick={() => setIsOpen((value) => !value)}
        >
          <MoreIcon />
        </button>
      </Tooltip>

      {isOpen && (
        <div className={`admin-dropdown-menu admin-recent-reports-row-menu${openUpward ? ' admin-dropdown-menu--up' : ''}`} role="menu">
          <button
            type="button"
            className="admin-dropdown-option"
            role="menuitem"
            onClick={() => {
              onViewDetails(report)
              setIsOpen(false)
            }}
          >
            <EyeIcon />
            {t('admin.reports.recent.viewDetails')}
          </button>
          <button
            type="button"
            className="admin-dropdown-option"
            role="menuitem"
            onClick={() => {
              onStartRename(report)
              setIsOpen(false)
            }}
          >
            <PencilIcon />
            {t('admin.reports.recent.rename')}
          </button>
          <button
            type="button"
            className="admin-dropdown-option admin-recent-reports-delete-option"
            role="menuitem"
            onClick={() => {
              onDelete(report.id)
              setIsOpen(false)
            }}
          >
            <TrashIcon />
            {t('admin.reports.recent.delete')}
          </button>
        </div>
      )}
    </div>
  )
}

interface RenameFieldProps {
  initialValue: string
  onCommit: (value: string) => void
  onCancel: () => void
}

// Edición inline en la misma celda (sin modal) -- Enter/blur confirma, Escape cancela, mismo
// criterio liviano que el resto del Admin usa para ediciones puntuales de un solo campo.
function RenameField({ initialValue, onCommit, onCancel }: RenameFieldProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState(initialValue)

  const commit = () => {
    const trimmed = value.trim()
    onCommit(trimmed.length > 0 ? trimmed : initialValue)
  }

  return (
    <input
      type="text"
      className="admin-recent-reports-rename-input"
      value={value}
      autoFocus
      aria-label={t('admin.reports.recent.renameInputLabel')}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
      }}
    />
  )
}

// El panel embebido en la página muestra únicamente los más recientes (pedido explícito: "aquí
// deben verse los 5 reportes más recientes") -- confía en que `reports` ya viene ordenado más
// nuevo primero (se prepend al generar, ver AdminReportsPage.tsx), mismo criterio que ya asumían
// DownloadMenu/AllReportsModal. El listado completo vive en AllReportsModal.tsx, paginado.
const PANEL_ROW_LIMIT = 5

interface RecentReportsPanelProps {
  reports: RecentReportRow[]
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
}

export function RecentReportsPanel({ reports, onDelete, onRename }: RecentReportsPanelProps) {
  const { t } = useTranslation()
  const [viewingReport, setViewingReport] = useState<RecentReportRow | null>(null)
  const [isAllReportsOpen, setIsAllReportsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const visibleReports = reports.slice(0, PANEL_ROW_LIMIT)

  return (
    <section className="admin-panel admin-recent-reports">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">{t('admin.reports.recent.title')}</h2>
        <button type="button" className="admin-recent-reports-view-all" onClick={() => setIsAllReportsOpen(true)}>
          {t('admin.reports.recent.viewAll')}
        </button>
      </div>

      {reports.length === 0 ? (
        <p className="admin-recent-reports-empty">{t('admin.reports.recent.empty')}</p>
      ) : (
        <div className="admin-recent-reports-scroll">
          <table className="admin-recent-reports-table">
            <thead>
              <tr>
                <th>{t('admin.reports.recent.name')}</th>
                <th>{t('admin.reports.recent.type')}</th>
                <th>{t('admin.reports.recent.dateRange')}</th>
                <th>{t('admin.reports.recent.generatedBy')}</th>
                <th>{t('admin.reports.recent.createdAt')}</th>
                <th className="admin-recent-reports-actions-head">{t('admin.reports.recent.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleReports.map((report) => (
                <tr key={report.id}>
                  <td className="admin-recent-reports-name">
                    {editingId === report.id ? (
                      <RenameField
                        initialValue={report.name}
                        onCommit={(name) => {
                          onRename(report.id, name)
                          setEditingId(null)
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      report.name
                    )}
                  </td>
                  <td>{t(`admin.reports.types.${report.type}`)}</td>
                  <td className="admin-recent-reports-secondary">{report.dateRangeLabel}</td>
                  <td className="admin-recent-reports-secondary">{report.generatedBy}</td>
                  <td className="admin-recent-reports-secondary">{report.createdAt}</td>
                  <td>
                    <div className="admin-recent-reports-actions">
                      <DownloadMenu report={report} />
                      <RowActionsMenu
                        report={report}
                        onDelete={onDelete}
                        onViewDetails={setViewingReport}
                        onStartRename={(r) => setEditingId(r.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewingReport && <ReportDetailsModal report={viewingReport} onClose={() => setViewingReport(null)} />}
      {isAllReportsOpen && <AllReportsModal reports={reports} onClose={() => setIsAllReportsOpen(false)} />}
    </section>
  )
}
