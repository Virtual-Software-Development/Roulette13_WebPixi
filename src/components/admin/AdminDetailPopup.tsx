import { useEffect, useRef, type ReactNode } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import './adminDetailPopup.css'

interface AdminDetailPopupProps {
  // Id del título del panel envuelto (aria-labelledby del dialog).
  labelledBy: string
  onClose: () => void
  // false mientras el panel no se puede cerrar (ej. guardando): ignora Escape y click afuera.
  dismissible?: boolean
  children: ReactNode
}

// Envoltorio modal para un panel de detalle que en desktop vive inline -- el panel trae su propio
// botón X (esquina superior derecha); acá se suman backdrop (click afuera cierra), Escape, focus
// trap y devolución del foco a la fila que lo abrió. Mismo mecanismo que ConfirmDialog.
export function AdminDetailPopup({ labelledBy, onClose, dismissible = true, children }: AdminDetailPopupProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  // Capturado en el render (antes de los efectos): un panel hijo puede enfocar su primer campo en
  // su propio efecto, que corre antes que el de acá.
  const previouslyFocusedRef = useRef(document.activeElement as HTMLElement | null)

  useFocusTrap(dialogRef, true)

  useEffect(() => {
    const previouslyFocused = previouslyFocusedRef.current
    // Solo si el panel no enfocó ya algo propio (ej. el primer campo de un formulario).
    if (!dialogRef.current?.contains(document.activeElement)) dialogRef.current?.focus()
    return () => previouslyFocused?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && dismissible) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, dismissible])

  return (
    <div
      className="admin-detail-popup-backdrop"
      // mousedown (no click) en el propio backdrop: un drag que empieza adentro del panel y suelta
      // afuera (ej. seleccionando texto) no lo cierra.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose()
      }}
    >
      <div ref={dialogRef} className="admin-detail-popup" role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}>
        {children}
      </div>
    </div>
  )
}
