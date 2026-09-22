import type { ReactNode } from 'react'
import './infoBanner.css'

interface InfoBannerProps {
  variant?: 'info' | 'warning'
  title: string
  description?: string
  // Ícono custom (ej. un candado para el aviso de "settings locked") -- debe traer la clase
  // admin-info-banner-icon aplicada por el caller, mismo criterio que StatusBadge con sus iconos.
  // Si se omite, se usa el ícono de info por defecto (comportamiento sin cambios).
  icon?: ReactNode
}

// Mismo ícono inline que CurrentBandsPanel.tsx (InfoIcon) -- no existe un archivo `info` dedicado
// en local-media (ver investigación previa), así que se reutiliza el patrón SVG inline.
function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="admin-info-banner-icon" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="12" y1="11" x2="12" y2="16.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="7.8" r="1.15" fill="currentColor" />
    </svg>
  )
}

// Panel de información reutilizable -- usado por el mensaje "Changes will be applied to future
// rounds only" en RTP Settings y el disclaimer del Simulator ("This is a simulation based on...").
export function InfoBanner({ variant = 'info', title, description, icon }: InfoBannerProps) {
  return (
    <div className="admin-info-banner" data-variant={variant}>
      {icon ?? <InfoIcon />}
      <span className="admin-info-banner-text">
        <span className="admin-info-banner-title">{title}</span>
        {description && <span className="admin-info-banner-description">{description}</span>}
      </span>
    </div>
  )
}
