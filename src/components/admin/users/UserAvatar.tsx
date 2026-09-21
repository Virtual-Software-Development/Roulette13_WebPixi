import type { UserAvatarAccent } from '../../../types/adminUsers'
import './adminUsers.css'

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

interface UserAvatarProps {
  fullName: string
  accent: UserAvatarAccent
}

// Siempre iniciales -- la app no soporta avatares/fotos de perfil reales todavía (ver
// types/adminUsers.ts), así que no hay una rama "si tiene avatar real, usarlo" que resolver acá.
export function UserAvatar({ fullName, accent }: UserAvatarProps) {
  return (
    <span className="admin-users-avatar" data-accent={accent} aria-hidden="true">
      {getInitials(fullName)}
    </span>
  )
}
