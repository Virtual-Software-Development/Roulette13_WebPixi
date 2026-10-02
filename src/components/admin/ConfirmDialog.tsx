import { useEffect, useRef, type ReactNode } from 'react'
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
  // Contenido extra entre la descripción y los botones (ej. el resumen Game/Current/New/Effective
  // Date del cambio de RTP, ver RtpSettingsPanel.tsx).
  children?: ReactNode
  // Aviso importante: ícono de advertencia ámbar junto al título (ej. cambio de RTP, que afecta
  // rondas reales) -- sin volver rojo el botón como `danger`.
  warning?: boolean
  // Color del juego afectado (con `warning`): tiñe la línea de acento superior y el botón de
  // confirmar -- ej. Next Results: red = Roulette, green = Pick 3, amber = Pick 4. Sin accent, la
  // variante warning queda ámbar (ej. RTP Settings).
  accent?: 'red' | 'green' | 'amber' | 'blue'
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" className="admin-confirm-dialog-warning-icon" aria-hidden="true" focusable="false">
      <path d="M12 3.5 21.5 20h-19L12 3.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 10v4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1.1" fill="currentColor" />
    </svg>
  )
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
  children,
  warning,
  accent,
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
        data-warning={warning || undefined}
        data-accent={accent}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-dialog-title"
        aria-describedby="admin-confirm-dialog-description"
        onClick={(e) => e.stopPropagation()}
      >
        {warning && (
          <span className="admin-confirm-dialog-warning-halo">
            <WarningIcon />
          </span>
        )}
        <h2 id="admin-confirm-dialog-title" className="admin-confirm-dialog-title" data-danger={danger}>
          {title}
        </h2>
        <p id="admin-confirm-dialog-description" className="admin-confirm-dialog-description">
          {description}
        </p>
        {children}
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
            data-accent={accent}
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
