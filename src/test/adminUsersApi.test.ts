import { describe, expect, it } from 'vitest'
import { buildUserPatch } from '../api/adminUsers'
import type { AdminUser, AdminUserFormData } from '../types/adminUsers'

const user: AdminUser = {
  id: 'c9c0958c-ea2f-438b-833c-e0507db8286d',
  fullName: 'Ana Pérez',
  username: 'ana',
  email: 'ana@example.com',
  role: 'cashier',
  status: 'active',
  avatarAccent: 'blue',
  lastLoginAt: null,
  isSelf: false,
}

const form = (patch: Partial<AdminUserFormData> = {}): AdminUserFormData => ({
  fullName: user.fullName,
  username: user.username,
  email: user.email,
  password: '',
  role: user.role,
  status: user.status,
  ...patch,
})

describe('buildUserPatch', () => {
  it('sin cambios no manda nada (password vacía = conservar la actual)', () => {
    expect(buildUserPatch(user, form())).toEqual({})
    expect(buildUserPatch(user, form({ fullName: ' Ana Pérez ', email: 'ANA@example.com' }))).toEqual({})
  })

  it('manda solo los campos cambiados', () => {
    expect(buildUserPatch(user, form({ role: 'admin', status: 'inactive', password: 'nuevaClave1' }))).toEqual({
      role: 'admin',
      isActive: false,
      password: 'nuevaClave1',
    })
    expect(buildUserPatch(user, form({ username: 'ana.p', email: 'ana.p@example.com' }))).toEqual({
      username: 'ana.p',
      email: 'ana.p@example.com',
    })
  })
})
