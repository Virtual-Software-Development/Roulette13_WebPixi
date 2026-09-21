import { useEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Genérico -- ciclo de Tab/Shift+Tab contenido dentro de un modal (ver ConfirmDialog.tsx/
// UserModal.tsx). Ningún modal existente lo tenía (DrawLogModal/ConfirmDialog originales solo
// enfocaban el primer botón al abrir), pedido explícito de accesibilidad para Users. Un solo nivel
// de modal a la vez (no hay modales anidados en el proyecto), así que no contempla ese caso.
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !containerRef.current) return
      const focusable = Array.from(containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null,
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [containerRef, active])
}
