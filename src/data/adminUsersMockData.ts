import type { AdminUser, AdminUserFormData, UserRole } from '../types/adminUsers'
import type { StatusBadgeVariant } from '../types/rtpDashboard'

// Mock TEMPORAL para Users -- no existe todavía backend/store de usuarios (ver investigación: no
// hay ningún endpoint/store de users/roles/auth en el proyecto; LoginPage.tsx tampoco llama a un
// backend real). Decisión confirmada con el usuario: UI completa con Create/Edit/Delete simulados
// (mismo criterio mock ya establecido en Settings/Game Events), roles limitados a
// Admin/Operator/Viewer (los de la referencia, no un modelo de permisos real). Reemplazar este
// archivo por el fetch/store real no requiere tocar ningún componente.

export const USER_ROLES: UserRole[] = ['admin', 'operator', 'viewer']

// role -> StatusBadgeVariant reutilizando las variantes ya existentes (ver StatusBadge.tsx), mismo
// criterio que GAME_EVENT_GAME_VARIANT: admin=danger(rojo), operator=info(azul), viewer=neutral.
export const USER_ROLE_VARIANT: Record<UserRole, StatusBadgeVariant> = {
  admin: 'danger',
  operator: 'info',
  viewer: 'neutral',
}

export const DEFAULT_USER_FORM: AdminUserFormData = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  role: 'viewer',
  status: 'active',
}

export const ADMIN_USERS: AdminUser[] = [
  {
    id: 'usr-1',
    fullName: 'John Doe',
    username: 'jdoe',
    email: 'jdoe@example.com',
    role: 'admin',
    status: 'active',
    avatarAccent: 'blue',
    lastLoginAt: '2026-09-18 10:24:00',
  },
  {
    id: 'usr-2',
    fullName: 'Sarah Miller',
    username: 'smiller',
    email: 'sarah@example.com',
    role: 'operator',
    status: 'active',
    avatarAccent: 'green',
    lastLoginAt: '2026-09-18 09:15:00',
  },
  {
    id: 'usr-3',
    fullName: 'Robert Johnson',
    username: 'rjohnson',
    email: 'robert@example.com',
    role: 'viewer',
    status: 'active',
    avatarAccent: 'orange',
    lastLoginAt: '2026-09-17 18:42:00',
  },
  {
    id: 'usr-4',
    fullName: 'Emily Lee',
    username: 'elee',
    email: 'emily@example.com',
    role: 'operator',
    status: 'inactive',
    avatarAccent: 'orange',
    lastLoginAt: '2026-09-15 14:21:00',
  },
  {
    id: 'usr-5',
    fullName: 'Michael Chen',
    username: 'mchen',
    email: 'michael@example.com',
    role: 'admin',
    status: 'active',
    avatarAccent: 'purple',
    lastLoginAt: '2026-09-18 11:03:00',
  },
  {
    id: 'usr-6',
    fullName: 'Anna Petrova',
    username: 'apetrova',
    email: 'anna@example.com',
    role: 'viewer',
    status: 'active',
    avatarAccent: 'orange',
    lastLoginAt: '2026-09-16 09:50:00',
  },
  {
    id: 'usr-7',
    fullName: 'Daniel Lopez',
    username: 'dlopez',
    email: 'daniel@example.com',
    role: 'operator',
    status: 'active',
    avatarAccent: 'blue',
    lastLoginAt: '2026-09-17 16:37:00',
  },
  {
    id: 'usr-8',
    fullName: 'Kevin Tran',
    username: 'ktran',
    email: 'kevin@example.com',
    role: 'viewer',
    status: 'inactive',
    avatarAccent: 'orange',
    lastLoginAt: '2026-09-10 12:11:00',
  },
  {
    id: 'usr-9',
    fullName: 'Laura Smith',
    username: 'lsmith',
    email: 'laura@example.com',
    role: 'operator',
    status: 'active',
    avatarAccent: 'green',
    lastLoginAt: '2026-09-18 08:26:00',
  },
  {
    id: 'usr-10',
    fullName: 'Nathan Moore',
    username: 'nmoore',
    email: 'nathan@example.com',
    role: 'viewer',
    status: 'active',
    avatarAccent: 'blue',
    lastLoginAt: '2026-09-14 20:05:00',
  },
  {
    id: 'usr-11',
    fullName: 'Grace Kim',
    username: 'gkim',
    email: 'grace@example.com',
    role: 'admin',
    status: 'active',
    avatarAccent: 'purple',
    lastLoginAt: '2026-09-18 07:40:00',
  },
  {
    id: 'usr-12',
    fullName: 'Victor Alvarez',
    username: 'valvarez',
    email: 'victor@example.com',
    role: 'viewer',
    status: 'inactive',
    avatarAccent: 'green',
    lastLoginAt: '2026-09-08 15:57:00',
  },
]
