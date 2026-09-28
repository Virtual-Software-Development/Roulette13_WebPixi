import type { AdminConfig } from '../types/adminConfig'
import { apiFetch } from './client'

export async function fetchAdminConfig(): Promise<AdminConfig> {
  const res = await apiFetch('/admin-config')
  if (!res.ok) throw new Error(`admin-config fetch failed: ${res.status}`)
  return res.json()
}

export async function saveAdminConfig(config: Partial<AdminConfig>): Promise<AdminConfig> {
  const res = await apiFetch('/admin-config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!res.ok) throw new Error(`admin-config save failed: ${res.status}`)
  return res.json()
}
