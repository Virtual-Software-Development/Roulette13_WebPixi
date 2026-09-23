import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../../../hooks/useFocusTrap'
import type { RecentReportRow } from '../../../types/adminReports'
import { CloseIcon } from './icons'
import './reportModal.css'

interface ReportDetailsModalProps {
  report: RecentReportRow
  onClose: () => void
}

// Mismo mecanismo de backdrop/Escape/focus trap que DrawLogModal/UserModal (ver reportModal.css) --
// solo lectura, no existe todavía una vista de detalle real por reporte (ver conversación).
export function ReportDetailsModal({ report, onClose }: ReportDetailsModalProps) {
  const { t } = useTranslation()
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

  const fields: Array<[string, string]> = [
    [t('admin.reports.recent.name'), report.name],
    [t('admin.reports.recent.type'), t(`admin.reports.types.${report.type}`)],
    [t('admin.reports.recent.dateRange'), report.dateRangeLabel],
    [t('admin.reports.recent.generatedBy'), report.generatedBy],
    [t('admin.reports.recent.createdAt'), report.createdAt],
  ]

  return (
    <div className="admin-report-modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="admin-report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-report-details-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-report-modal-header">
          <div>
            <h2 id="admin-report-details-title" className="admin-report-modal-title">
              {t('admin.reports.recent.detailsTitle')}
            </h2>
            <p className="admin-report-modal-subtitle">{report.name}</p>
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

        <div className="admin-report-modal-fields">
          {fields.map(([label, value]) => (
            <div key={label} className="admin-report-modal-field">
              <span className="admin-report-modal-field-label">{label}</span>
              <span className="admin-report-modal-field-value">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
