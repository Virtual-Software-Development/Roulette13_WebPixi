import type { ReactNode } from 'react'
import type { StatusBadgeVariant } from '../../types/rtpDashboard'
import './statusBadge.css'

interface StatusBadgeProps {
  variant: StatusBadgeVariant
  icon?: ReactNode
  children: ReactNode
}

// Genérico -- usado por los RTP metric cards (Within Band/Above Target/On Target) y por Recent
// RTP Changes (Auto Applied/Applied). Son indicadores, no acciones: nunca un <button>.
export function StatusBadge({ variant, icon, children }: StatusBadgeProps) {
  return (
    <span className="admin-status-badge" data-variant={variant}>
      {icon}
      {children}
    </span>
  )
}
