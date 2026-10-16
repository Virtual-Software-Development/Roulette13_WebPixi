import { useCallback, useEffect, useRef, useState } from 'react'
import type { TFunction } from 'i18next'
import { AdminAuthError, restoreAdminSession } from '../api/adminSession'
import {
  createRtpProfile,
  fetchRtpProfileActivity,
  fetchRtpProfiles,
  fetchRtpSettings,
  saveRtpSettings,
  setRtpProfileDisabled,
} from '../api/rtpManagement'
import { RTP_GAMES } from '../data/rtpGameLabels'
import type { RtpGame } from '../types/rtpDashboard'
import type { NewRtpProfile, RtpProfile, RtpProfileActivity, RtpSettingsData } from '../types/rtpManagement'

export type RtpLoadStatus = 'loading' | 'ready' | 'error'

// Sin sesión de admin: aviso de login; si no, el mensaje del backend (apperror, en español) o el
// genérico de carga.
export function describeRtpError(err: unknown, t: TFunction): string {
  if (err instanceof AdminAuthError) return t('admin.rtp.management.errors.login')
  return err instanceof Error && err.message ? err.message : t('admin.rtp.management.errors.load')
}

// Configuración RTP vigente de los dos juegos (Settings y los valores iniciales de un profile nuevo).
export function useRtpSettings() {
  const [status, setStatus] = useState<RtpLoadStatus>('loading')
  const [settingsByGame, setSettingsByGame] = useState<Record<RtpGame, RtpSettingsData> | null>(null)
  const [error, setError] = useState<unknown>(null)
  const mounted = useRef(true)

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const rows = await Promise.all(RTP_GAMES.map(fetchRtpSettings))
      if (!mounted.current) return
      setSettingsByGame(Object.fromEntries(rows.map((s) => [s.game, s])) as Record<RtpGame, RtpSettingsData>)
      setError(null)
      setStatus('ready')
    } catch (err) {
      if (!mounted.current) return
      setError(err)
      setStatus('error')
    }
  }, [])

  // Recupera la sesión de admin (cookie de refresh) antes de la primera carga; sin sesión la carga
  // falla con AdminAuthError y se muestra como aviso de login.
  useEffect(() => {
    mounted.current = true
    void restoreAdminSession().finally(() => {
      if (mounted.current) void load()
    })
    return () => {
      mounted.current = false
    }
  }, [load])

  // Lanza si el backend rechaza el cambio; si lo acepta, vuelve a leer la fila guardada.
  const save = useCallback(async (data: RtpSettingsData) => {
    await saveRtpSettings(data)
    const saved = await fetchRtpSettings(data.game)
    if (mounted.current) setSettingsByGame((prev) => (prev ? { ...prev, [data.game]: saved } : prev))
  }, [])

  return { status, settingsByGame, error, reload: load, save }
}

// RTP profiles + su actividad reciente (tab Scheduling).
export function useRtpProfiles() {
  const [status, setStatus] = useState<RtpLoadStatus>('loading')
  const [profiles, setProfiles] = useState<RtpProfile[]>([])
  const [activity, setActivity] = useState<RtpProfileActivity[]>([])
  const [error, setError] = useState<unknown>(null)
  const mounted = useRef(true)

  const load = useCallback(async () => {
    try {
      const [nextProfiles, nextActivity] = await Promise.all([fetchRtpProfiles(), fetchRtpProfileActivity()])
      if (!mounted.current) return
      setProfiles(nextProfiles)
      setActivity(nextActivity)
      setError(null)
      setStatus('ready')
    } catch (err) {
      if (!mounted.current) return
      setError(err)
      setStatus('error')
    }
  }, [])

  // Mismo arranque que useRtpSettings.
  useEffect(() => {
    mounted.current = true
    void restoreAdminSession().finally(() => {
      if (mounted.current) void load()
    })
    return () => {
      mounted.current = false
    }
  }, [load])

  const reload = useCallback(() => {
    setStatus('loading')
    void load()
  }, [load])

  // Ambas lanzan si el backend rechaza la operación; si sale bien, refrescan tabla y actividad.
  const create = useCallback(
    async (input: NewRtpProfile) => {
      await createRtpProfile(input)
      await load()
    },
    [load],
  )

  const setDisabled = useCallback(
    async (id: number, disabled: boolean) => {
      await setRtpProfileDisabled(id, disabled)
      await load()
    },
    [load],
  )

  return { status, profiles, activity, error, reload, create, setDisabled }
}
