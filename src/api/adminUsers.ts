import { adminFetch, currentAdminUserId, hasAdminSession, readAdminJson } from './adminSession'
import type { AdminUser, AdminUserFormData, AdminUserStats, UserAvatarAccent, UserRole, UserStatus } from '../types/adminUsers'

// /users de quick-money-backend (internal/users/handler.go): búsqueda, filtros y paginación en el
// backend. Sin DELETE: la baja es PATCH {isActive:false} (el backend además le cierra la sesión).
// Exige sesión de admin: sin ella adminFetch lanza AdminAuthError.

interface ApiUser {
  id: string
  username: string
  fullName: string
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  isSelf: boolean
}

interface ApiUserPage {
  items: ApiUser[]
  total: number
  stats: AdminUserStats
}

export interface AdminUsersQuery {
  search?: string
  role?: UserRole
  status?: UserStatus
  limit: number
  offset: number
}

export interface AdminUsersPage {
  users: AdminUser[]
  total: number
  stats: AdminUserStats
}

// Solo los campos que cambian; password solo si se restablece.
export type AdminUserPatch = Partial<{
  fullName: string
  username: string
  email: string
  role: UserRole
  isActive: boolean
  password: string
}>

const AVATAR_ACCENTS: UserAvatarAccent[] = ['blue', 'green', 'orange', 'purple']

function avatarAccentFor(id: string): UserAvatarAccent {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return AVATAR_ACCENTS[Math.abs(hash) % AVATAR_ACCENTS.length]
}

function toUser(u: ApiUser): AdminUser {
  return {
    id: u.id,
    fullName: u.fullName,
    username: u.username,
    email: u.email,
    role: u.role,
    status: u.isActive ? 'active' : 'inactive',
    avatarAccent: avatarAccentFor(u.id),
    lastLoginAt: u.lastLoginAt,
    isSelf: u.isSelf,
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function fetchAdminUsers(query: AdminUsersQuery, signal?: AbortSignal): Promise<AdminUsersPage> {
  const params = new URLSearchParams({ limit: String(query.limit), offset: String(query.offset) })
  if (query.search) params.set('q', query.search)
  if (query.role) params.set('role', query.role)
  if (query.status) params.set('status', query.status)
  const page = await readAdminJson<ApiUserPage>(await adminFetch(`/users?${params}`, { signal }), 'users')
  return { users: page.items.map(toUser), total: page.total, stats: page.stats }
}

// Usuario de la sesión actual (header del Admin), o null sin sesión de admin.
export async function fetchCurrentAdminUser(): Promise<AdminUser | null> {
  if (!(await hasAdminSession())) return null
  const id = currentAdminUserId()
  if (!id) return null
  return toUser(await readAdminJson<ApiUser>(await adminFetch(`/users/${encodeURIComponent(id)}`), 'current user'))
}

export async function createAdminUser(data: AdminUserFormData): Promise<AdminUser> {
  const body = {
    username: data.username,
    password: data.password,
    fullName: data.fullName,
    email: data.email,
    role: data.role,
    isActive: data.status === 'active',
  }
  const res = await adminFetch('/users', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) })
  return toUser(await readAdminJson<ApiUser>(res, 'create user'))
}

export async function updateAdminUser(id: string, patch: AdminUserPatch): Promise<AdminUser> {
  const res = await adminFetch(`/users/${encodeURIComponent(id)}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(patch) })
  return toUser(await readAdminJson<ApiUser>(res, 'update user'))
}

// Diferencia entre el usuario y el formulario de Edit; vacío = nada que guardar.
export function buildUserPatch(user: AdminUser, data: AdminUserFormData): AdminUserPatch {
  const patch: AdminUserPatch = {}
  if (data.fullName.trim() !== user.fullName) patch.fullName = data.fullName
  if (data.username.trim() !== user.username) patch.username = data.username
  if (data.email.trim().toLowerCase() !== user.email.toLowerCase()) patch.email = data.email
  if (data.role !== user.role) patch.role = data.role
  if (data.status !== user.status) patch.isActive = data.status === 'active'
  if (data.password) patch.password = data.password
  return patch
}
