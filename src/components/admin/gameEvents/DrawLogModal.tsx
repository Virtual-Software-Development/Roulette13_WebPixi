import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { parseApiDateTime } from '../../../utils/time'
import { CloseIcon } from './icons'
import type { GameEvent } from '../../../types/adminGameEvents'
import './drawLogModal.css'

const LOG_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

interface DrawLogModalProps {
  event: GameEvent
  onClose: () => void
}

// Único overlay/dialog de todo el Admin Panel (pedido explícito del usuario en la Fase 1: el
// proyecto no tenía ningún sistema de modal genérico -- ver nextResults.css/RtpSettingsPanel, que
// resuelven confirmaciones inline en vez de overlay). Autocontenido a propósito, no una base para
// un "sistema de dialogs": si aparece un segundo caso de uso, ahí sí vale la pena generalizar.
export function DrawLogModal({ event, onClose }: DrawLogModalProps) {
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
    <div className="admin-draw-log-backdrop" onClick={onClose}>
      <div
        className="admin-draw-log-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-draw-log-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-draw-log-header">
          <div>
            <h2 id="admin-draw-log-title" className="admin-draw-log-title">
              {t('admin.gameEvents.drawLog.title')}
            </h2>
            <p className="admin-draw-log-subtitle">
              {event.name} · #{event.id}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="admin-draw-log-close"
            aria-label={t('admin.gameEvents.drawLog.close')}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        {event.logEntries.length === 0 ? (
          <p className="admin-game-events-result-caption">{t('admin.gameEvents.drawLog.empty')}</p>
        ) : (
          <ul className="admin-draw-log-list">
            {event.logEntries.map((entry) => (
              <li key={entry.id} className="admin-draw-log-entry">
                <span className="admin-draw-log-entry-timestamp">{LOG_TIMESTAMP_FORMATTER.format(parseApiDateTime(entry.timestamp))}</span>
                <span className="admin-draw-log-entry-message">{entry.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
