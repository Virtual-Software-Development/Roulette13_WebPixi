import { adminFetch, readAdminJson } from './adminSession'
import { BACKEND_GAME, gameFromBackend } from './backendGame'
import type { RtpGame } from '../types/rtpDashboard'
import {
  DAYS_OF_WEEK,
  type NewRtpProfile,
  type RtpProfile,
  type RtpProfileActivity,
  type RtpProfileActivityEvent,
  type RtpProfileStatus,
  type RtpSettingsData,
} from '../types/rtpManagement'

// RTP Management contra quick-money-backend: Settings = game_rtp_settings (internal/gameconfig),
// Scheduling = rtp_profile + su actividad (internal/rtpprofiles). Todo exige sesión de admin: sin
// ella adminFetch lanza AdminAuthError.

// Con ventana ilimitada el backend informa ventanaMedicionEventos = MaxInt32 (lo que lee el motor).
const UNLIMITED_WINDOW = 2_147_483_647

interface BackendRtpSetting {
  juego: string
  targetRtp: number
  minBand: number
  maxBand: number
  ventanaMedicionEventos: number
  topeCorreccionEventoPct: number
  factorSuavizado: number
  effectiveDate: string
  // Ausentes en backends anteriores al flag.
  correctionWindowUnlimited?: boolean
  configuredCorrectionWindow?: number
}

export async function fetchRtpSettings(game: RtpGame): Promise<RtpSettingsData> {
  const s: BackendRtpSetting = await readAdminJson(await adminFetch(`/rtp-settings/${BACKEND_GAME[game]}`), 'RTP settings')
  return {
    game,
    targetRtp: s.targetRtp,
    minBand: s.minBand,
    maxBand: s.maxBand,
    correctionWindow: s.configuredCorrectionWindow ?? s.ventanaMedicionEventos,
    correctionWindowUnlimited: s.correctionWindowUnlimited ?? s.ventanaMedicionEventos >= UNLIMITED_WINDOW,
    maxCorrectionPerEvent: s.topeCorreccionEventoPct,
    smoothingFactor: s.factorSuavizado,
    effectiveDate: s.effectiveDate,
  }
}

// Reemplaza la configuración del juego; el backend la fecha hoy (effectiveDate vacío) y valida
// bandas, ventana, tope y suavizado -- sus mensajes llegan como Error.message.
export async function saveRtpSettings(data: RtpSettingsData): Promise<void> {
  const body = {
    juego: BACKEND_GAME[data.game],
    targetRtp: data.targetRtp,
    minBand: data.minBand,
    maxBand: data.maxBand,
    ventanaMedicionEventos: data.correctionWindow,
    correctionWindowUnlimited: data.correctionWindowUnlimited,
    topeCorreccionEventoPct: data.maxCorrectionPerEvent,
    factorSuavizado: data.smoothingFactor,
    effectiveDate: '',
  }
  const res = await adminFetch('/rtp-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  await readAdminJson(res, 'save RTP settings')
}

interface BackendProfile {
  id: number
  name: string
  juego: string
  targetRtp: number
  minBand: number
  maxBand: number
  activeDays: string[]
  restrictHours: boolean
  startTime?: string
  endTime?: string
  startDate: string
  expiresDate: string
  status: string
  createdBy?: string
  updatedAt: string
}

interface BackendProfileEvent {
  id: number
  profileName: string
  juego: string
  eventType: string
  changedBy?: string
  createdAt: string
  startDate: string
  expiresDate: string
  startTime?: string
  endTime?: string
}

const PROFILE_STATUSES: RtpProfileStatus[] = ['active', 'scheduled', 'expiringSoon', 'expired', 'disabled', 'replaced']

// El backend nombra 'enabled' a la reactivación manual (ACTIVATED).
const PROFILE_EVENTS: Record<string, RtpProfileActivityEvent> = {
  created: 'created',
  enabled: 'activated',
  activated: 'activated',
  disabled: 'disabled',
  edited: 'edited',
  expired: 'expired',
  replaced: 'replaced',
}

function toProfile(p: BackendProfile): RtpProfile | null {
  const game = gameFromBackend(p.juego)
  if (!game) return null
  return {
    id: p.id,
    name: p.name,
    game,
    targetRtp: p.targetRtp,
    minBand: p.minBand,
    maxBand: p.maxBand,
    activeDays: DAYS_OF_WEEK.filter((d) => p.activeDays.includes(d)),
    restrictHours: p.restrictHours,
    startTime: p.startTime ?? null,
    endTime: p.endTime ?? null,
    startDate: p.startDate,
    expiresDate: p.expiresDate,
    status: PROFILE_STATUSES.includes(p.status as RtpProfileStatus) ? (p.status as RtpProfileStatus) : 'expired',
    createdBy: p.createdBy ?? '',
    updatedAt: p.updatedAt,
  }
}

function requireProfile(p: BackendProfile): RtpProfile {
  const profile = toProfile(p)
  if (!profile) throw new Error(`Unknown game "${p.juego}"`)
  return profile
}

export async function fetchRtpProfiles(): Promise<RtpProfile[]> {
  const rows: BackendProfile[] = await readAdminJson(await adminFetch('/rtp-profiles'), 'RTP profiles')
  return rows.map(toProfile).filter((p): p is RtpProfile => p !== null)
}

export async function createRtpProfile(input: NewRtpProfile): Promise<RtpProfile> {
  const body = {
    name: input.name,
    juego: BACKEND_GAME[input.game],
    targetRtp: input.targetRtp,
    minBand: input.minBand,
    maxBand: input.maxBand,
    activeDays: input.activeDays,
    restrictHours: input.restrictHours,
    startTime: input.restrictHours ? input.startTime : undefined,
    endTime: input.restrictHours ? input.endTime : undefined,
    startDate: input.startDate,
    expiresDate: input.expiresDate,
  }
  const res = await adminFetch('/rtp-profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return requireProfile(await readAdminJson(res, 'create RTP profile'))
}

export async function setRtpProfileDisabled(id: number, disabled: boolean): Promise<RtpProfile> {
  const res = await adminFetch(`/rtp-profiles/${id}/disabled`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disabled }),
  })
  return requireProfile(await readAdminJson(res, 'update RTP profile'))
}

export async function fetchRtpProfileActivity(limit = 20): Promise<RtpProfileActivity[]> {
  const rows: BackendProfileEvent[] = await readAdminJson(await adminFetch(`/rtp-profile-events?limit=${limit}`), 'RTP profile activity')
  const out: RtpProfileActivity[] = []
  for (const e of rows) {
    const game = gameFromBackend(e.juego)
    const event = PROFILE_EVENTS[e.eventType]
    if (!game || !event) continue
    out.push({
      id: e.id,
      profileName: e.profileName,
      game,
      event,
      startDate: e.startDate,
      expiresDate: e.expiresDate,
      startTime: e.startTime ?? null,
      endTime: e.endTime ?? null,
      changedBy: e.changedBy ?? '',
      dateTime: e.createdAt,
    })
  }
  return out
}
