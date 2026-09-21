import { useEffect, useRef } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import './confirmDialog.css'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  // Estilo del botón de confirmar -- true para acciones irreversibles (ej. Factory Reset), el rojo
  // de "peligro" en vez del rojo primario normal del Admin.
  danger?: boolean
  // Ambos opcionales -- Factory Reset (Settings > System) sigue sin usarlos, su onConfirm es
  // síncrono e instantáneo. Delete User (Users) sí los usa: mientras loading=true, deshabilita
  // ambos botones y bloquea Escape/backdrop/Tab-out para evitar doble submit mientras "elimina".
  loading?: boolean
  confirmLoadingLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

// Generaliza el overlay de DrawLogModal.tsx (Game Events) -- ese quedó deliberadamente
// autocontenido con el comentario "si aparece un segundo caso de uso, ahí sí vale la pena
// generalizar" (ver conversación). Este es ese segundo caso: una confirmación genérica título/
// descripción/Cancel/Confirm para cualquier acción destructiva del Admin (Factory Reset en
// Settings > System, Delete User en Users), sin duplicar el mecanismo de backdrop/foco/Escape.
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger,
  loading,
  confirmLoadingLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useFocusTrap(dialogRef, true)

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    cancelButtonRef.current?.focus()
    return () => previouslyFocusedRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, loading])

  return (
    <div className="admin-confirm-dialog-backdrop" onClick={loading ? undefined : onCancel}>
      <div
        ref={dialogRef}
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
          <button
            ref={cancelButtonRef}
            type="button"
            className="admin-confirm-dialog-btn admin-confirm-dialog-btn--ghost"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`admin-confirm-dialog-btn ${danger ? 'admin-confirm-dialog-btn--danger' : 'admin-confirm-dialog-btn--primary'}`}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? (confirmLoadingLabel ?? confirmLabel) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
