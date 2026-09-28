import { useId, type ReactNode } from 'react'
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
}

// Tooltip accesible genérico -- ningún sistema de tooltip existía en el proyecto (ver
// investigación previa), así que este es el único/reutilizable. CSS puro (:hover/:focus-within),
// sin JS state. El wrapper es focusable (tabIndex=0) para que también funcione envolviendo
// contenido NO interactivo (ej. el badge "Locked", un <span>) y para el caso de un <button
// disabled> (que los navegadores sacan del tab order): el wrapper sigue siendo alcanzable por
// teclado y sigue recibiendo hover aunque el hijo esté disabled.
export function Tooltip({ content, children, id, label }: TooltipProps) {
  const generatedId = useId()
  const tooltipId = id ?? generatedId

  return (
    <span className="admin-tooltip" tabIndex={0} aria-label={label} aria-describedby={tooltipId}>
      {children}
      <span role="tooltip" id={tooltipId} className="admin-tooltip-bubble">
        {content}
      </span>
    </span>
  )
}
