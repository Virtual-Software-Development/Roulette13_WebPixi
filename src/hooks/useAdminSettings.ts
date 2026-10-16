import { useCallback, useEffect, useRef, useState } from 'react'
import { restoreAdminSession } from '../api/adminSession'
import { fetchAdminSettings, saveAdminSettings, type AdminSettingsSnapshot } from '../api/adminSettings'
import type { AdminSettingsData } from '../types/adminSettings'

export type AdminSettingsStatus = 'loading' | 'ready' | 'error'

// Settings del admin (GET/PUT /admin-settings): lo guardado + los defaults del backend.
export function useAdminSettings() {
  const [status, setStatus] = useState<AdminSettingsStatus>('loading')
  const [snapshot, setSnapshot] = useState<AdminSettingsSnapshot | null>(null)
  const [error, setError] = useState<unknown>(null)
  const mounted = useRef(true)

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      await restoreAdminSession()
      const next = await fetchAdminSettings()
      if (!mounted.current) return
      setSnapshot(next)
      setError(null)
      setStatus('ready')
    } catch (err) {
      if (!mounted.current) return
      setError(err)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void load()
    return () => {
      mounted.current = false
    }
  }, [load])

  // Lanza si el backend rechaza el cambio -- la página muestra el error.
  const save = useCallback(async (settings: AdminSettingsData) => {
    const next = await saveAdminSettings(settings)
    if (mounted.current) setSnapshot(next)
    return next
  }, [])

  return { status, snapshot, error, reload: load, save }
}
