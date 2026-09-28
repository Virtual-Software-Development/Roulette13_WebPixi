import { apiFetch } from './client'
import type { CreateRtpProfileInput, RtpProfileApi, RtpProfileEventApi } from '../types/rtpProfileApi'

export async function fetchRtpProfiles(): Promise<RtpProfileApi[]> {
  const res = await apiFetch('/rtp-profiles')
  if (!res.ok) throw new Error(`rtp-profiles fetch failed: ${res.status}`)
  // `?? []` defends against a Go nil slice serializing as JSON `null` for an empty result (fixed
  // server-side, but this is cheap insurance against a stale deploy or any other endpoint with the
  // same gap) -- callers .map() this directly.
  return (await res.json()) ?? []
}

export async function createRtpProfileApi(input: CreateRtpProfileInput): Promise<RtpProfileApi> {
  const res = await apiFetch('/rtp-profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body: { error?: string } | null = await res.json().catch(() => null)
    throw new Error(body?.error ?? `rtp-profiles create failed: ${res.status}`)
  }
  return res.json()
}

export async function setRtpProfileDisabledApi(id: number, disabled: boolean): Promise<RtpProfileApi> {
  const res = await apiFetch(`/rtp-profiles/${id}/disabled`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disabled }),
  })
  if (!res.ok) throw new Error(`rtp-profiles disable failed: ${res.status}`)
  return res.json()
}

export async function fetchRtpProfileEvents(limit = 20): Promise<RtpProfileEventApi[]> {
  const res = await apiFetch(`/rtp-profile-events?limit=${limit}`)
  if (!res.ok) throw new Error(`rtp-profile-events fetch failed: ${res.status}`)
  return (await res.json()) ?? []
}
