import { apiFetch } from './client'
import type { AlertApi, SystemEventApi } from '../types/auditEvent'

export async function fetchEventHistory(limit = 1000): Promise<SystemEventApi[]> {
  const res = await apiFetch(`/audit/event-history?limit=${limit}`)
  if (!res.ok) throw new Error(`audit/event-history fetch failed: ${res.status}`)
  // `?? []` -- a Go nil slice serializes as JSON `null` for zero rows.
  return (await res.json()) ?? []
}

export async function fetchAlerts(): Promise<AlertApi[]> {
  const res = await apiFetch('/alerts')
  if (!res.ok) throw new Error(`alerts fetch failed: ${res.status}`)
  return (await res.json()) ?? []
}
