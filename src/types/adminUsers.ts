// Usuarios del panel (GET/POST/PATCH /users de quick-money-backend, internal/users). Los roles son
// los del backend: admin y cashier.

export type UserRole = 'admin' | 'cashier'

export type UserStatus = 'active' | 'inactive'

// Color del círculo de iniciales (ver UserAvatar.tsx); el backend no guarda avatares, así que se
// deriva del id para que cada usuario conserve el suyo.
export type UserAvatarAccent = 'blue' | 'green' | 'orange' | 'purple'

export interface AdminUser {
  id: string
  fullName: string
  username: string
  email: string
  role: UserRole
  status: UserStatus
  avatarAccent: UserAvatarAccent
  // ISO 8601; null si nunca inició sesión (el backend registra los logins desde que existe la
  // página, así que los usuarios anteriores arrancan en null).
  lastLoginAt: string | null
  // El admin con la sesión actual: no puede desactivarse ni quitarse el rol.
  isSelf: boolean
}

// Conteos globales, sin los filtros de la consulta.
export interface AdminUserStats {
  total: number
  active: number
  inactive: number
  admins: number
}

// Datos del formulario Create/Edit. En Edit, password vacío = conservar la contraseña actual.
export interface AdminUserFormData {
  fullName: string
  username: string
  email: string
  password: string
  role: UserRole
  status: UserStatus
}
