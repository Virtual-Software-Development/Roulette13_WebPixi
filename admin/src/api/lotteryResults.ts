import { apiFetch } from './client'
import type { LotteryLastResultApi } from '../types/lotteryResult'

export async function fetchLotteryLastResults(): Promise<LotteryLastResultApi[]> {
  const res = await apiFetch('/lottery/last-results')
  if (!res.ok) throw new Error(`lottery/last-results fetch failed: ${res.status}`)
  // Same nil-slice-serializes-as-null reasoning as fetchRouletteLastResults.
  return (await res.json()) ?? []
}
