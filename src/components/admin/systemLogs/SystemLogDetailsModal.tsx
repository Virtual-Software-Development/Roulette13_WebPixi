import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../StatusBadge'
import { parseApiDateTime } from '../../../utils/time'
import { SYSTEM_LOG_ACTION_VARIANT, SYSTEM_LOG_STATUS_VARIANT, type SystemLogEntry } from '../../../types/adminSystemLogs'
import { CloseIcon } from './icons'
import './systemLogDetailsModal.css'

const DETAIL_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

interface SystemLogDetailsModalProps {
  entry: SystemLogEntry
  onClose: () => void
}

// Modal propio (NO reutiliza AdminLogModal.tsx: ese está tipado a VideoValidationLogEntry
// {id,timestamp,message}, forma que no le alcanza a un log de sistema con actor/módulo/acción/
// status/change). Mismo mecanismo que AdminLogModal (backdrop + Escape + foco inicial en Close),
// layout propio con resumen + grid de campos + bloque de cambio + bloque de details.
export function SystemLogDetailsModal({ entry, onClose }: SystemLogDetailsModalProps) {
  const { t } = useTranslation()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="admin-system-log-modal-backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="admin-system-log-modal-title" className="admin-system-log-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-system-log-modal-header">
          <h2 id="admin-system-log-modal-title" className="admin-system-log-modal-title">
            {t('admin.systemLogs.detail.title')}
          </h2>
          <button ref={closeButtonRef} type="button" className="admin-system-log-modal-close" aria-label={t('admin.systemLogs.detail.close')} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="admin-system-log-modal-summary">
          <span className="admin-system-log-modal-summary-icon" data-variant={SYSTEM_LOG_ACTION_VARIANT[entry.action]} aria-hidden="true">
            {entry.action.slice(0, 1)}
          </span>
          <div>
            <p className="admin-system-log-modal-action">{entry.action}</p>
            <p className="admin-system-log-modal-summary-text">{entry.summary}</p>
          </div>
        </div>

        <dl className="admin-system-log-modal-grid">
          <div>
            <dt>{t('admin.systemLogs.detail.dateTime')}</dt>
            <dd>{DETAIL_TIMESTAMP_FORMATTER.format(parseApiDateTime(entry.timestamp))}</dd>
          </div>
          <div>
            <dt>{t('admin.systemLogs.detail.user')}</dt>
            <dd>
              {entry.actor} ({entry.actorRole})
            </dd>
          </div>
          <div>
            <dt>{t('admin.systemLogs.detail.module')}</dt>
            <dd>{t(`admin.systemLogs.module.${entry.module}`)}</dd>
          </div>
          <div>
            <dt>{t('admin.systemLogs.detail.action')}</dt>
            <dd>{entry.action}</dd>
          </div>
          <div>
            <dt>{t('admin.systemLogs.detail.status')}</dt>
            <dd>
              <StatusBadge variant={SYSTEM_LOG_STATUS_VARIANT[entry.status]}>{t(`admin.systemLogs.status.${entry.status}`)}</StatusBadge>
            </dd>
          </div>
        </dl>

        {entry.change && (
          <div className="admin-system-log-modal-section">
            <p className="admin-system-log-modal-section-title">{t('admin.systemLogs.detail.changeLabel')}</p>
            <div className="admin-system-log-modal-change">
              <span className="admin-system-log-modal-change-field">{entry.change.fieldLabel}</span>
              <span className="admin-system-log-modal-change-values">
                <span className="admin-system-log-modal-change-before">{entry.change.before}</span>
                <span className="admin-system-log-modal-change-arrow" aria-hidden="true">
                  →
                </span>
                <span className="admin-system-log-modal-change-after">{entry.change.after}</span>
              </span>
            </div>
          </div>
        )}

        <div className="admin-system-log-modal-section">
          <p className="admin-system-log-modal-section-title">{t('admin.systemLogs.detail.detailsLabel')}</p>
          <p className="admin-system-log-modal-details-text">{entry.detailsText ?? entry.summary}</p>
        </div>
      </div>
    </div>
  )
}
