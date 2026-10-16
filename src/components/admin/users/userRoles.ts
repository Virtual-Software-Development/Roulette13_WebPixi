import type { AdminUserFormData, UserRole } from '../../../types/adminUsers'
import type { StatusBadgeVariant } from '../../../types/rtpDashboard'

export const USER_ROLES: UserRole[] = ['admin', 'cashier']

// role -> variante de StatusBadge: admin=danger (rojo), cashier=info (azul).
export const USER_ROLE_VARIANT: Record<UserRole, StatusBadgeVariant> = {
  admin: 'danger',
  cashier: 'info',
}

export const DEFAULT_USER_FORM: AdminUserFormData = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  role: 'cashier',
  status: 'active',
}
