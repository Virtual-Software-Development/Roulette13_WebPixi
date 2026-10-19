import { useCallback, useEffect, useRef, useState } from 'react'
import { restoreAdminSession } from '../api/adminSession'
import {
  fetchCurrentQuickMoneyEvent,
  fetchQuickMoneyNextResult,
  substituteQuickMoneyResult,
  type QuickMoneyNextResult,
} from '../api/quickMoneyNextResult'

export type QuickMoneyNextResultStatus = 'loading' | 'noEvent' | 'ready' | 'error'

// El resultado de un sorteo de Quick Money ya es definitivo desde que se crea y cada lectura queda
// auditada en el backend -- no se vuelve a pedir hasta un cambio del admin o el sorteo siguiente
// (mismo criterio que useRouletteNextResult después de congelar).
const AFTER_DRAW_DELAY_MS = 3_000
const NO_EVENT_RETRY_MS = 3_000

function msUntil(iso: string): number {
  return new Date(iso).getTime() - Date.now()
}

// Próximo sorteo de Quick Money para Next Results (admin): sorteo pendiente + su Pick 3 y Pick 4.
export function useQuickMoneyNextResult() {
  const [status, setStatus] = useState<QuickMoneyNextResultStatus>('loading')
  const [data, setData] = useState<QuickMoneyNextResult | null>(null)
  const [error, setError] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mounted = useRef(true)

  const load = useCallback(async () => {
    clearTimeout(timer.current)
    const later = (ms: number) => {
      if (mounted.current) timer.current = setTimeout(() => void load(), Math.max(ms, 500))
    }
    try {
      const event = await fetchCurrentQuickMoneyEvent()
      if (!mounted.current) return
      if (!event) {
        setStatus('noEvent')
        setData(null)
        later(NO_EVENT_RETRY_MS)
        return
      }
      const next = await fetchQuickMoneyNextResult(event.id)
      if (!mounted.current) return
      setData(next)
      setStatus('ready')
      setError('')
      later(msUntil(next.event.horaProgramada) + AFTER_DRAW_DELAY_MS)
    } catch (err) {
      if (!mounted.current) return
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
      later(NO_EVENT_RETRY_MS)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    // Recupera la sesión de admin (cookie de refresh) antes de pedir el resultado, que la exige.
    void restoreAdminSession().finally(() => {
      if (mounted.current) void load()
    })
    return () => {
      mounted.current = false
      clearTimeout(timer.current)
    }
  }, [load])

  // Cambia el resultado del sorteo y vuelve a pedirlo.
  const substitute = useCallback(
    async (eventId: number, pick3: string, pick4: string, motivo: string) => {
      await substituteQuickMoneyResult(eventId, pick3, pick4, motivo)
      await load()
    },
    [load],
  )

  return { status, data, error, substitute }
}
