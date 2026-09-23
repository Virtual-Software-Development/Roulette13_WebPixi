import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../../../hooks/useFocusTrap'
import type { RecentReportRow } from '../../../types/adminReports'
import { DownloadMenu } from './DownloadMenu'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from './icons'
import './reportModal.css'

// Mismo tamaño de página que no existía un precedente propio en Reports -- criterio: que quepa
// sin scroll dentro del alto fijo del modal (~600px, ver reportModal.css), mismo mecanismo de
// paginación que UserTable.tsx (Users): footer "Showing X-Y of Z" + números de página, sin
// truncar con "...", ese componente tampoco lo hace.
const PAGE_SIZE = 10

interface AllReportsModalProps {
  reports: RecentReportRow[]
  onClose: () => void
}

// Mismo mecanismo de backdrop/Escape/focus trap que ReportDetailsModal.tsx -- de solo lectura
// salvo la descarga (pedido explícito: "debe permitir descargar el archivo"), que reutiliza el
// mismo DownloadMenu de la tabla principal (ver DownloadMenu.tsx). Renombrar/Eliminar siguen
// viviendo solo en RecentReportsPanel (mismo criterio que DrawLogModal: sin acciones destructivas
// acá).
export function AllReportsModal({ reports, onClose }: AllReportsModalProps) {
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState(1)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useFocusTrap(dialogRef, true)

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    return () => previouslyFocusedRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const totalPages = Math.max(1, Math.ceil(reports.length / PAGE_SIZE))
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageReports = reports.slice(pageStart, pageStart + PAGE_SIZE)

  return (
    <div className="admin-report-modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="admin-report-modal admin-report-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-all-reports-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-report-modal-header">
          <div>
            <h2 id="admin-all-reports-title" className="admin-report-modal-title">
              {t('admin.reports.recent.allReportsTitle')}
            </h2>
            <p className="admin-report-modal-subtitle">{t('admin.reports.recent.allReportsCount', { count: reports.length })}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="admin-report-modal-close"
            aria-label={t('admin.reports.recent.close')}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        {reports.length === 0 ? (
          <p className="admin-report-modal-empty">{t('admin.reports.recent.empty')}</p>
        ) : (
          <div className="admin-report-modal-scroll">
            <table className="admin-report-modal-table">
              <thead>
                <tr>
                  <th>{t('admin.reports.recent.name')}</th>
                  <th>{t('admin.reports.recent.type')}</th>
                  <th>{t('admin.reports.recent.dateRange')}</th>
                  <th>{t('admin.reports.recent.generatedBy')}</th>
                  <th>{t('admin.reports.recent.createdAt')}</th>
                  <th className="admin-report-modal-table-actions-head">{t('admin.reports.recent.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pageReports.map((report) => (
                  <tr key={report.id}>
                    <td className="admin-report-modal-table-name">{report.name}</td>
                    <td>{t(`admin.reports.types.${report.type}`)}</td>
                    <td className="admin-report-modal-table-secondary">{report.dateRangeLabel}</td>
                    <td className="admin-report-modal-table-secondary">{report.generatedBy}</td>
                    <td className="admin-report-modal-table-secondary">{report.createdAt}</td>
                    <td className="admin-report-modal-table-actions">
                      <DownloadMenu report={report} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reports.length > 0 && (
          <div className="admin-report-modal-footer">
            <p className="admin-report-modal-count">
              {t('admin.reports.recent.showingCount', {
                from: pageStart + 1,
                to: Math.min(pageStart + PAGE_SIZE, reports.length),
                total: reports.length,
              })}
            </p>

            {totalPages > 1 && (
              <nav className="admin-report-modal-pagination" aria-label={t('admin.reports.recent.pagination')}>
                <button
                  type="button"
                  className="admin-report-modal-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  aria-label={t('admin.reports.recent.previousPage')}
                >
                  <ChevronLeftIcon />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className="admin-report-modal-page-btn"
                    data-active={pageNumber === currentPage}
                    aria-current={pageNumber === currentPage ? 'page' : undefined}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  className="admin-report-modal-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  aria-label={t('admin.reports.recent.nextPage')}
                >
                  <ChevronRightIcon />
                </button>
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
