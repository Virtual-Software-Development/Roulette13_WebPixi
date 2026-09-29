import { useEffect, type RefObject } from 'react'

// Genérico -- usado por los dropdowns del AdminDashboard (DateRangeControl, el selector de rango
// de GamesActivityChart) para cerrarse al hacer click fuera, sin duplicar el listener en cada uno.
export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutsideClick: () => void) {
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutsideClick()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [ref, onOutsideClick])
}
