import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../StatusBadge'
import { parseApiDateTime } from '../../../utils/time'
import { SYSTEM_LOG_ACTION_VARIANT, SYSTEM_LOG_STATUS_VARIANT, type SystemLogEntry } from '../../../types/adminSystemLogs'
import { CloseIcon } from './icons'
import './systemLogDetailsPanel.css'

const DETAIL_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

interface SystemLogDetailsPanelProps {
  entry: SystemLogEntry
  onClose: () => void
}

// Panel lateral a la derecha de la lista (antes un modal, pedido explícito): la lista sigue visible
// e interactiva, así que se puede pasar de un log a otro sin cerrar nada. Sin backdrop ni foco
// forzado en Close (robaría el foco de la fila con la que se navega); Escape y el botón X de la
// esquina superior derecha lo cierran. Layout: resumen + grid de campos + bloque de cambio + details.
export function SystemLogDetailsPanel({ entry, onClose }: SystemLogDetailsPanelProps) {
  const { t } = useTranslation()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <aside className="admin-panel admin-system-log-panel" aria-labelledby="admin-system-log-panel-title">
      {/* key = id: al elegir otro log el contenido se remonta y su scroll vuelve arriba. */}
      <div key={entry.id} className="admin-system-log-panel-scroll">
        <div className="admin-system-log-panel-header">
          <h2 id="admin-system-log-panel-title" className="admin-system-log-panel-title">
            {t('admin.systemLogs.detail.title')}
          </h2>
          <button type="button" className="admin-system-log-panel-close" aria-label={t('admin.systemLogs.detail.close')} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="admin-system-log-panel-summary">
          <span className="admin-system-log-panel-summary-icon" data-variant={SYSTEM_LOG_ACTION_VARIANT[entry.action]} aria-hidden="true">
            {entry.action.slice(0, 1)}
          </span>
          <div>
            <p className="admin-system-log-panel-action">{entry.action}</p>
            <p className="admin-system-log-panel-summary-text">{entry.summary}</p>
          </div>
        </div>

        <dl className="admin-system-log-panel-grid">
          <div>
            <dt>{t('admin.systemLogs.detail.dateTime')}</dt>
            <dd>{DETAIL_TIMESTAMP_FORMATTER.format(parseApiDateTime(entry.timestamp))}</dd>
          </div>
          {/* User ocupa 2 columnas: así la segunda fila queda Module | Action | Status. */}
          <div className="admin-system-log-panel-grid-wide">
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
          <div className="admin-system-log-panel-section">
            <p className="admin-system-log-panel-section-title">{t('admin.systemLogs.detail.changeLabel')}</p>
            <div className="admin-system-log-panel-change">
              <span className="admin-system-log-panel-change-field">{entry.change.fieldLabel}</span>
              <span className="admin-system-log-panel-change-values">
                <span className="admin-system-log-panel-change-before">{entry.change.before}</span>
                <span className="admin-system-log-panel-change-arrow" aria-hidden="true">
                  →
                </span>
                <span className="admin-system-log-panel-change-after">{entry.change.after}</span>
              </span>
            </div>
          </div>
        )}

        <div className="admin-system-log-panel-section">
          <p className="admin-system-log-panel-section-title">{t('admin.systemLogs.detail.detailsLabel')}</p>
          <p className="admin-system-log-panel-details-text">{entry.detailsText ?? entry.summary}</p>
        </div>
      </div>
    </aside>
  )
}
