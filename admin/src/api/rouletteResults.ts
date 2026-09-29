import { apiFetch } from './client'
import type { RouletteLastResultApi } from '../types/rouletteResult'

export async function fetchRouletteLastResults(): Promise<RouletteLastResultApi[]> {
  const res = await apiFetch('/roulette/last-results')
  if (!res.ok) throw new Error(`roulette/last-results fetch failed: ${res.status}`)
  // `?? []` -- a Go nil slice serializes as JSON `null` for zero rows (e.g. a fresh install
  // before the first draw); DashboardPage.tsx calls .sort()/.map() on this directly.
  return (await res.json()) ?? []
}
