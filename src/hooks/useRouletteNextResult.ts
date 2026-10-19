import { useCallback, useEffect, useRef, useState } from 'react'
import { restoreAdminSession } from '../api/adminSession'
import {
  fetchBetsByNumber,
  fetchCurrentRouletteEvent,
  fetchRouletteNextResult,
  substituteRouletteResult,
  type RouletteNextResultView,
} from '../api/rouletteNextResult'

export type RouletteNextResultStatus = 'loading' | 'noEvent' | 'ready' | 'error'

// Antes de congelar el RTP por número es "en vivo" (cambia con cada apuesta): se refresca seguido.
// Desde la congelación el resultado y el snapshot ya son definitivos, y cada lectura del resultado
// queda auditada en el backend (pending_result_read) -- no se vuelve a pedir hasta un cambio del
// admin (reload) o el evento siguiente.
const LIVE_REFRESH_MS = 15_000
const AFTER_FREEZE_DELAY_MS = 1_500
const AFTER_DRAW_DELAY_MS = 3_000
const NO_EVENT_RETRY_MS = 3_000

function msUntil(iso: string): number {
  return new Date(iso).getTime() - Date.now()
}

// Próximo resultado de Roulette para Next Results (admin): evento pendiente + RouletteRTPSnapshot
// + resultado definitivo. Los endpoints son solo admin (ver router.go del backend): la auditoría
// registra quién leyó o cambió el resultado.
export function useRouletteNextResult() {
  const [status, setStatus] = useState<RouletteNextResultStatus>('loading')
  const [data, setData] = useState<RouletteNextResultView | null>(null)
  const [error, setError] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mounted = useRef(true)

  const load = useCallback(async () => {
    clearTimeout(timer.current)
    const later = (ms: number) => {
      if (mounted.current) timer.current = setTimeout(() => void load(), Math.max(ms, 500))
    }
    try {
      const event = await fetchCurrentRouletteEvent()
      if (!mounted.current) return
      if (!event) {
        setStatus('noEvent')
        setData(null)
        later(NO_EVENT_RETRY_MS)
        return
      }
      // Las apuestas por número son informativas (hover del tablero): si fallan, el resto sigue.
      const [next, betsByNumber] = await Promise.all([fetchRouletteNextResult(event.id), fetchBetsByNumber().catch(() => null)])
      if (!mounted.current) return
      setData({ ...next, betsByNumber })
      setStatus('ready')
      setError('')
      if (next.event.estado === 'sugerido') {
        later(Math.min(LIVE_REFRESH_MS, msUntil(next.event.horaCongelacion) + AFTER_FREEZE_DELAY_MS))
      } else {
        later(msUntil(next.event.horaProgramada) + AFTER_DRAW_DELAY_MS)
      }
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

  // Cambia el resultado del evento y vuelve a pedir el resultado decidido.
  const substitute = useCallback(
    async (eventId: number, resultado: string, motivo: string) => {
      await substituteRouletteResult(eventId, resultado, motivo)
      await load()
    },
    [load],
  )

  return { status, data, error, reload: load, substitute }
}
