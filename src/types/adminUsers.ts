// No existe todavía un modelo de usuario/rol real en el proyecto (ver adminUsersMockData.ts para
// el detalle de la investigación) -- estos tipos son mock, pensados para reemplazarse por el
// contrato real de la API el día que exista, sin tocar los componentes (mismo criterio que
// adminGameEvents.ts/adminSettings.ts).

export type UserRole = 'admin' | 'operator' | 'viewer'

export type UserStatus = 'active' | 'inactive'

// Colorea el círculo de iniciales cuando el usuario no tiene avatar real (ver UserAvatar.tsx) --
// la app no soporta avatares/fotos de perfil todavía (confirmado: ni upload ni campo alguno en
// ningún tipo existente), así que esto siempre se resuelve a iniciales.
export type UserAvatarAccent = 'blue' | 'green' | 'orange' | 'purple'

export interface AdminUser {
  id: string
  fullName: string
  username: string
  email: string
  role: UserRole
  status: UserStatus
  avatarAccent: UserAvatarAccent
  // Formato "yyyy-MM-dd HH:mm:ss" (ver utils/time.ts:parseApiDateTime), mismo criterio que
  // GameEvent.startTime/SystemInformationData.serverTime. null para un usuario recién creado por
  // Add User -- nunca inició sesión todavía, así que no hay timestamp real que mostrar (evita
  // inventar un "just now" falso, ver conversación).
  lastLoginAt: string | null
}

// Datos editables del modal Create/Edit -- password solo aplica en modo Create (ver
// conversación: sin backend de auth real, Edit no expone ningún campo de contraseña).
export interface AdminUserFormData {
  fullName: string
  username: string
  email: string
  password: string
  role: UserRole
  status: UserStatus
}
