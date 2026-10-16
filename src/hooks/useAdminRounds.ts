import { useCallback, useEffect, useRef, useState } from 'react'
import { restoreAdminSession } from '../api/adminSession'
import {
  fetchRecentRounds,
  fetchResultFrequency,
  fetchRound,
  fetchRoundSummary,
  fetchRoundTimeline,
  fetchRounds,
  type RoundSummary,
  type RoundTimeline,
  type RoundsPage,
  type RoundsQuery,
} from '../api/adminRounds'
import type { GameEventDetail } from '../types/adminGameEvents'
import type { GameEventsOverTimeRange, RecentRound, ResultFrequencyByGame } from '../types/adminDashboard'

export type AdminLoadStatus = 'loading' | 'ready' | 'error'

export interface AdminLoad<T> {
  status: AdminLoadStatus
  // Se conserva el último dato mientras se recarga (las tablas/gráficos no parpadean).
  data: T | null
  error: unknown
  reload: () => void
}

// Carga `load` cada vez que cambia `key` (o con reload), cancelando el pedido anterior. key null =
// nada que cargar (data queda en null).
export function useAdminLoad<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>): AdminLoad<T> {
  const [status, setStatus] = useState<AdminLoadStatus>('loading')
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const loadRef = useRef(load)

  // Antes del efecto de carga (los efectos corren en orden): siempre usa el `load` del último render.
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    if (key === null) {
      setData(null)
      setStatus('ready')
      return
    }
    const controller = new AbortController()
    setStatus('loading')
    void (async () => {
      try {
        await restoreAdminSession()
        const result = await loadRef.current(controller.signal)
        if (controller.signal.aborted) return
        setData(result)
        setError(null)
        setStatus('ready')
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err)
        setStatus('error')
      }
    })()
    return () => controller.abort()
  }, [key, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { status, data, error, reload }
}

// Una página de Game Events (GET /rounds) para los filtros dados.
export function useGameEvents(query: RoundsQuery): AdminLoad<RoundsPage> {
  return useAdminLoad(JSON.stringify(query), (signal) => fetchRounds(query, signal))
}

// Detalle de una ronda; null = ninguna seleccionada.
export function useGameEventDetail(id: string | null): AdminLoad<GameEventDetail> {
  return useAdminLoad(id, (signal) => fetchRound(id ?? '', signal))
}

export interface DashboardData {
  summary: RoundSummary
  recentRounds: RecentRound[]
  resultFrequency: ResultFrequencyByGame
}

const RECENT_ROUNDS_LIMIT = 8

// Todo lo del Dashboard que depende del período elegido (más Recent Rounds y Result Frequency, que
// se refrescan junto con él).
export function useDashboardData(from: Date, to: Date): AdminLoad<DashboardData> {
  return useAdminLoad(`${from.toISOString()}|${to.toISOString()}`, async (signal) => {
    const [summary, recentRounds, resultFrequency] = await Promise.all([
      fetchRoundSummary(from, to, signal),
      fetchRecentRounds(RECENT_ROUNDS_LIMIT, signal),
      fetchResultFrequency(signal),
    ])
    return { summary, recentRounds, resultFrequency }
  })
}

export function useRoundTimeline(range: GameEventsOverTimeRange): AdminLoad<RoundTimeline> {
  return useAdminLoad(range, (signal) => fetchRoundTimeline(range, signal))
}
