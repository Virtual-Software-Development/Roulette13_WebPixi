import { useCallback, useEffect, useState } from 'react'
import { restoreAdminSession } from '../api/adminSession'
import { fetchAdminUsers, type AdminUsersPage, type AdminUsersQuery } from '../api/adminUsers'

export type AdminUsersStatus = 'loading' | 'ready' | 'error'

// Una página de Users para los filtros dados; cada cambio cancela el pedido anterior. Mientras
// carga se conserva la página previa (la tabla no parpadea al paginar). reload() vuelve a pedir la
// misma página, p.ej. después de crear o editar.
export function useAdminUsers(query: AdminUsersQuery) {
  const [status, setStatus] = useState<AdminUsersStatus>('loading')
  const [data, setData] = useState<AdminUsersPage | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const key = JSON.stringify(query)

  useEffect(() => {
    const controller = new AbortController()
    const current: AdminUsersQuery = JSON.parse(key)
    setStatus('loading')
    void (async () => {
      try {
        await restoreAdminSession()
        const page = await fetchAdminUsers(current, controller.signal)
        if (controller.signal.aborted) return
        setData(page)
        setError(null)
        setStatus('ready')
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err)
        setStatus('error')
      }
    })()
    return () => controller.abort()
  }, [key, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { status, data, error, reload }
}
