import { useEffect, useRef } from 'react'
import './confirmDialog.css'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  // Estilo del botón de confirmar -- true para acciones irreversibles (ej. Factory Reset), el rojo
  // de "peligro" en vez del rojo primario normal del Admin.
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Generaliza el overlay de DrawLogModal.tsx (Game Events) -- ese quedó deliberadamente
// autocontenido con el comentario "si aparece un segundo caso de uso, ahí sí vale la pena
// generalizar" (ver conversación). Este es ese segundo caso: una confirmación genérica título/
// descripción/Cancel/Confirm para cualquier acción destructiva del Admin (hoy: Factory Reset en
// Settings > System), sin duplicar el mecanismo de backdrop/foco/Escape.
export function ConfirmDialog({ title, description, confirmLabel, cancelLabel, danger, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelButtonRef.current?.focus()
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div className="admin-confirm-dialog-backdrop" onClick={onCancel}>
      <div
        className="admin-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-dialog-title"
        aria-describedby="admin-confirm-dialog-description"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="admin-confirm-dialog-title" className="admin-confirm-dialog-title" data-danger={danger}>
          {title}
        </h2>
        <p id="admin-confirm-dialog-description" className="admin-confirm-dialog-description">
          {description}
        </p>
        <div className="admin-confirm-dialog-actions">
          <button ref={cancelButtonRef} type="button" className="admin-confirm-dialog-btn admin-confirm-dialog-btn--ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`admin-confirm-dialog-btn ${danger ? 'admin-confirm-dialog-btn--danger' : 'admin-confirm-dialog-btn--primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
