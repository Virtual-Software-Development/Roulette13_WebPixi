import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import './tooltip.css'

interface TooltipProps {
  content: string
  children: ReactNode
  // Permite que el caller reutilice el mismo id para linkear un aria-describedby externo (ej. el
  // <input> de un field locked, ver AdminFormField.tsx/RtpSettingsPanel.tsx) -- si no se pasa, se
  // genera uno propio.
  id?: string
  // Nombre accesible del trigger cuando el contenido envuelto es un ícono sin texto visible (ej.
  // LockedBadge.tsx) -- sin esto, un lector de pantalla no tendría forma de anunciar qué es antes
  // de leer la descripción del tooltip.
  label?: string
  // Fuerza el bubble visible además del hover/focus -- ej. LockedBadge al hacer click en un campo
  // bloqueado (ver RtpSettingsPanel.tsx), donde el mouse no está sobre el candado.
  open?: boolean
}

type TooltipAlign = 'start' | 'end'

// Rect del ancestro más cercano que recorta su contenido (overflow distinto de visible, ej.
// .admin-main con overflow-y:auto) -- el bubble tiene que entrar ahí adentro, no solo en el
// viewport, o queda cortado contra el sidebar.
function getClipRect(element: HTMLElement): { left: number; right: number } {
  let node = element.parentElement
  while (node && node !== document.body) {
    const style = getComputedStyle(node)
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
      const rect = node.getBoundingClientRect()
      return { left: rect.left, right: rect.right }
    }
    node = node.parentElement
  }
  return { left: 0, right: window.innerWidth }
}

// Tooltip accesible genérico -- ningún sistema de tooltip existía en el proyecto (ver
// investigación previa), así que este es el único/reutilizable. Visibilidad por CSS puro
// (:hover/:focus-within). El wrapper es focusable (tabIndex=0) para que también funcione envolviendo
// contenido NO interactivo (ej. el badge "Locked", un <span>) y para el caso de un <button
// disabled> (que los navegadores sacan del tab order): el wrapper sigue siendo alcanzable por
// teclado y sigue recibiendo hover aunque el hijo esté disabled.
//
// Lado de apertura: se decide al mostrarse, midiendo el espacio real a cada lado del trigger dentro
// del contenedor que recorta -- 'start' abre hacia la derecha (anclado al borde izquierdo del
// trigger), 'end' hacia la izquierda. Así el candado junto a un label a la izquierda del panel abre
// hacia la derecha, y un trigger cerca del borde derecho (ej. Save Settings) abre hacia la izquierda.
export function Tooltip({ content, children, id, label, open }: TooltipProps) {
  const generatedId = useId()
  const tooltipId = id ?? generatedId
  const triggerRef = useRef<HTMLSpanElement>(null)
  const bubbleRef = useRef<HTMLSpanElement>(null)
  const [align, setAlign] = useState<TooltipAlign>('end')

  const updateAlign = () => {
    const trigger = triggerRef.current
    const bubble = bubbleRef.current
    if (!trigger || !bubble) return
    const triggerRect = trigger.getBoundingClientRect()
    const clip = getClipRect(trigger)
    const bubbleWidth = bubble.offsetWidth
    const spaceRight = clip.right - triggerRect.left
    const spaceLeft = triggerRect.right - clip.left
    // Preferencia: abrir hacia la izquierda (comportamiento previo) salvo que no entre y del otro
    // lado sí haya más lugar.
    setAlign(spaceLeft >= bubbleWidth || spaceLeft >= spaceRight ? 'end' : 'start')
  }

  useEffect(() => {
    if (open) updateAlign()
  }, [open])

  return (
    <span
      ref={triggerRef}
      className="admin-tooltip"
      tabIndex={0}
      aria-label={label}
      aria-describedby={tooltipId}
      onMouseEnter={updateAlign}
      onFocus={updateAlign}
    >
      {children}
      <span ref={bubbleRef} role="tooltip" id={tooltipId} className="admin-tooltip-bubble" data-align={align} data-open={open || undefined}>
        {content}
      </span>
    </span>
  )
}
