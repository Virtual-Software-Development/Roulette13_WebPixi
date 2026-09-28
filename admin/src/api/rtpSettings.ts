import { apiFetch } from './client'
import type { RtpSettingApi } from '../types/rtpSetting'

// null means "no RTP configuration exists yet for this game" (404) -- a real, honest state, not an
// error. pick3/pick4 currently 404 since lottery isn't a live game yet; roulette has a real row.
export async function fetchRtpSetting(juego: string): Promise<RtpSettingApi | null> {
  const res = await apiFetch(`/rtp-settings/${juego}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`rtp-settings fetch failed: ${res.status}`)
  return res.json()
}

// Always an INSERT server-side (internal/gameconfig/handler.go: "Adding a row here never touches
// already-frozen events") -- there is no update-in-place endpoint, by design (past events keep
// referencing whatever band was in effect when they ran).
export async function createRtpSetting(setting: Omit<RtpSettingApi, 'id'>): Promise<{ id: number }> {
  const res = await apiFetch('/rtp-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(setting),
  })
  if (!res.ok) {
    const body: { error?: string } | null = await res.json().catch(() => null)
    throw new Error(body?.error ?? `rtp-settings save failed: ${res.status}`)
  }
  return res.json()
}
