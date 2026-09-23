import { useLayoutEffect, useState, type RefObject } from 'react'

// Altura estimada de un admin-dropdown-menu de 3 opciones (padding + filas, ver adminLayout.css)
// -- suficiente margen para decidir si conviene abrir hacia arriba, no necesita ser exacta.
const ESTIMATED_MENU_HEIGHT_PX = 160

// Un dropdown position:absolute nunca escapa el overflow:auto/hidden/scroll de su ancestro más
// cercano que lo recorte -- esa es la frontera real, NO el viewport del browser (ver conversación:
// medir contra window.innerHeight dejaba "openUpward" en false para filas cerca del fondo de
// AllReportsModal, porque el modal de 600px vive centrado dentro de un viewport mucho más alto).
// Si ningún ancestro recorta antes de <body>, el viewport SÍ es la frontera real (ej. la tabla de
// RecentReportsPanel, que solo tiene overflow-x, así que ahí el límite es la ventana).
function getClippingBoundaryBottom(el: HTMLElement): number {
  let node: HTMLElement | null = el.parentElement
  while (node && node !== document.body) {
    const overflowY = window.getComputedStyle(node).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'hidden') {
      return node.getBoundingClientRect().bottom
    }
    node = node.parentElement
  }
  return window.innerHeight
}

// Genérico -- cualquier admin-dropdown-menu (../components/admin/adminLayout.css) que pueda vivir
// cerca del borde inferior de su contenedor (ej. la tabla de un modal, ver conversación: "qué pasa
// si el modal tiene 80 datos" -- el menú de descarga de la última fila quedaba cortado).
export function useDropdownFlip(triggerRef: RefObject<HTMLElement | null>, isOpen: boolean): boolean {
  const [openUpward, setOpenUpward] = useState(false)

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setOpenUpward(false)
      return
    }
    const el = triggerRef.current
    const rect = el.getBoundingClientRect()
    const boundaryBottom = Math.min(getClippingBoundaryBottom(el), window.innerHeight)
    const spaceBelow = boundaryBottom - rect.bottom
    setOpenUpward(spaceBelow < ESTIMATED_MENU_HEIGHT_PX && rect.top > ESTIMATED_MENU_HEIGHT_PX)
  }, [isOpen, triggerRef])

  return openUpward
}
