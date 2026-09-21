import type { ReactNode } from 'react'
import './adminUsers.css'

export type UserStatAccent = 'blue' | 'green' | 'red' | 'purple'

interface UserStatCardProps {
  title: string
  value: number
  icon: ReactNode
  accent: UserStatAccent
  // Ausente para Total Users (pedido explícito: no inventar un indicador de crecimiento que no
  // existe -- a diferencia de AdminStatCard.tsx, que sí tiene datos de tendencia reales del
  // Dashboard, acá solo el porcentaje sobre el total es un dato genuino derivable del propio
  // dataset). Presente para Active/Inactive/Admin, donde percent = count/total sí es real.
  progress?: { percent: number; label: string }
}

// Mismo lenguaje visual que AdminStatCard.tsx (icon halo + accent en borde, ver adminStatCard.css)
// pero con una fila de porcentaje+barra en vez de una fila de tendencia -- namespace propio en vez
// de reutilizar esa clase literalmente (mismo criterio ya establecido en el resto del Admin).
export function UserStatCard({ title, value, icon, accent, progress }: UserStatCardProps) {
  return (
    <div className="admin-users-stat-card" data-accent={accent}>
      <div className="admin-users-stat-icon-halo">{icon}</div>
      <div className="admin-users-stat-body">
        <span className="admin-users-stat-title">{title}</span>
        <span className="admin-users-stat-value">{value}</span>
        {progress && (
          <div className="admin-users-stat-progress">
            <span className="admin-users-stat-progress-label">{progress.label}</span>
            <span className="admin-users-stat-progress-bar">
              <span className="admin-users-stat-progress-fill" style={{ width: `${progress.percent}%` }} />
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
