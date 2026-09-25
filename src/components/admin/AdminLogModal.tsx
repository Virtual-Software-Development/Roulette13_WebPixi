import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { parseApiDateTime } from '../../utils/time'
import type { VideoValidationLogEntry } from '../../types/adminVideos'
import './adminLogModal.css'

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

const LOG_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

interface AdminLogModalProps {
  title: string
  subtitle: string
  entries: VideoValidationLogEntry[]
  onClose: () => void
}

// Generalización de DrawLogModal.tsx (gameEvents/) -- ese componente se dejó deliberadamente
// autocontenido con el comentario "si aparece un segundo caso de uso, ahí sí vale la pena
// generalizar" (era el único overlay de todo el Admin). Este es ese segundo caso: mismo mecanismo
// (backdrop + Escape + foco inicial en Close) y misma estructura visual, ahora reutilizado por los
// 3 tabs de Video Management en vez de duplicar el modal 3 veces. No toca DrawLogModal.tsx (fuera
// de alcance, Game Events no forma parte de esta unificación).
export function AdminLogModal({ title, subtitle, entries, onClose }: AdminLogModalProps) {
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
    <div className="admin-log-modal-backdrop" onClick={onClose}>
      <div className="admin-log-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-log-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="admin-log-modal-header">
          <div>
            <h2 id="admin-log-modal-title" className="admin-log-modal-title">
              {title}
            </h2>
            <p className="admin-log-modal-subtitle">{subtitle}</p>
          </div>
          <button ref={closeButtonRef} type="button" className="admin-log-modal-close" aria-label={t('admin.videos.shared.close')} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="admin-log-modal-empty">{t('admin.videos.shared.validationLog.empty')}</p>
        ) : (
          <ul className="admin-log-modal-list">
            {entries.map((entry) => (
              <li key={entry.id} className="admin-log-modal-entry">
                <span className="admin-log-modal-entry-timestamp">{LOG_TIMESTAMP_FORMATTER.format(parseApiDateTime(entry.timestamp))}</span>
                <span className="admin-log-modal-entry-message">{entry.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
