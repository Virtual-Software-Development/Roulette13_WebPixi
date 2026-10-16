import { useEffect, useState } from 'react'
import { restoreAdminSession } from '../api/adminSession'
import { fetchSystemLogs, type SystemLogsPage, type SystemLogsQuery } from '../api/systemLogs'

export type SystemLogsStatus = 'loading' | 'ready' | 'error'

// Una página de System Logs para los filtros dados; cada cambio de filtros cancela el pedido
// anterior. Mientras carga se conserva la página previa (la tabla no parpadea al paginar).
export function useSystemLogs(query: SystemLogsQuery) {
  const [status, setStatus] = useState<SystemLogsStatus>('loading')
  const [data, setData] = useState<SystemLogsPage | null>(null)
  const [error, setError] = useState<unknown>(null)
  const key = JSON.stringify(query)

  useEffect(() => {
    const controller = new AbortController()
    const current: SystemLogsQuery = JSON.parse(key)
    setStatus('loading')
    void (async () => {
      try {
        await restoreAdminSession()
        const page = await fetchSystemLogs(current, controller.signal)
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
  }, [key])

  return { status, data, error }
}
