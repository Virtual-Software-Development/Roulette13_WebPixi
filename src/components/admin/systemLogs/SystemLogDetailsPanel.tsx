import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { parseApiDateTime } from '../../../utils/time'
import { localizeLogDescription } from '../../../utils/localizeLogDescription'
import { systemLogActionVariant, type SystemLogChange, type SystemLogEntry } from '../../../types/adminSystemLogs'
import { CloseIcon } from './icons'
import { systemLogActorName } from './systemLogDisplay'
import './systemLogDetailsPanel.css'

const DETAIL_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

// target_rtp viene de rtp_log (porcentaje); el resto son nombres de setting de system_log, datos.
function formatChange(change: SystemLogChange, t: TFunction) {
  const isRtp = change.field === 'target_rtp'
  const value = (v: string | null) => (v === null ? '—' : isRtp ? `${v}%` : v)
  return { label: isRtp ? t('admin.systemLogs.detail.fields.targetRtp') : change.field, before: value(change.before), after: value(change.after) }
}

interface SystemLogDetailsPanelProps {
  entry: SystemLogEntry
  onClose: () => void
}

// Panel lateral a la derecha de la lista (antes un modal, pedido explícito): la lista sigue visible
// e interactiva, así que se puede pasar de un log a otro sin cerrar nada. Sin backdrop ni foco
// forzado en Close (robaría el foco de la fila con la que se navega); Escape y el botón X de la
// esquina superior derecha lo cierran. Layout: resumen + grid de campos + bloque de cambio + details.
// Game/Round/Target User/RTP Profile solo aparecen si el log se refiere a uno.
export function SystemLogDetailsPanel({ entry, onClose }: SystemLogDetailsPanelProps) {
  const { t } = useTranslation()
  const change = entry.change ? formatChange(entry.change, t) : null
  const actorRole = entry.actorType === 'MACHINE' ? t('admin.systemLogs.actor.machine') : entry.actorRole

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
          <span className="admin-system-log-panel-summary-icon" data-variant={systemLogActionVariant(entry.action)} aria-hidden="true">
            {entry.action.slice(0, 1)}
          </span>
          <div>
            <p className="admin-system-log-panel-action">{entry.action}</p>
            <p className="admin-system-log-panel-summary-text">{entry.summary != null ? localizeLogDescription(entry.summary, t) : t('admin.systemLogs.detail.hiddenUntilDraw')}</p>
          </div>
        </div>

        <dl className="admin-system-log-panel-grid">
          <div>
            <dt>{t('admin.systemLogs.detail.dateTime')}</dt>
            <dd>{DETAIL_TIMESTAMP_FORMATTER.format(parseApiDateTime(entry.timestamp))}</dd>
          </div>
          {/* User ocupa 2 columnas: así la segunda fila queda Module | Action | Game. */}
          <div className="admin-system-log-panel-grid-wide">
            <dt>{t('admin.systemLogs.detail.user')}</dt>
            <dd>
              {systemLogActorName(entry, t)}
              {actorRole && ` (${actorRole})`}
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
          {entry.game && (
            <div>
              <dt>{t('admin.systemLogs.detail.game')}</dt>
              <dd>{t(`admin.systemLogs.module.${entry.game}`)}</dd>
            </div>
          )}
          {entry.roundCode && (
            <div>
              <dt>{t('admin.systemLogs.detail.round')}</dt>
              <dd>{entry.roundCode}</dd>
            </div>
          )}
          {entry.targetUser && (
            <div>
              <dt>{t('admin.systemLogs.detail.targetUser')}</dt>
              <dd>{entry.targetUser}</dd>
            </div>
          )}
          {entry.rtpProfile && (
            <div>
              <dt>{t('admin.systemLogs.detail.rtpProfile')}</dt>
              <dd>
                {entry.rtpProfile.name} ({entry.rtpProfile.event})
              </dd>
            </div>
          )}
        </dl>

        {change && (
          <div className="admin-system-log-panel-section">
            <p className="admin-system-log-panel-section-title">{t('admin.systemLogs.detail.changeLabel')}</p>
            <div className="admin-system-log-panel-change">
              <span className="admin-system-log-panel-change-field">{change.label}</span>
              <span className="admin-system-log-panel-change-values">
                <span className="admin-system-log-panel-change-before">{change.before}</span>
                <span className="admin-system-log-panel-change-arrow" aria-hidden="true">
                  →
                </span>
                <span className="admin-system-log-panel-change-after">{change.after}</span>
              </span>
            </div>
          </div>
        )}

        <div className="admin-system-log-panel-section">
          <p className="admin-system-log-panel-section-title">{t('admin.systemLogs.detail.detailsLabel')}</p>
          <p className="admin-system-log-panel-details-text">{entry.summary != null ? localizeLogDescription(entry.summary, t) : t('admin.systemLogs.detail.hiddenUntilDraw')}</p>
        </div>
      </div>
    </aside>
  )
}
