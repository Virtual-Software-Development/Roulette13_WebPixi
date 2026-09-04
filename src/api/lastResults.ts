import type { LastResultsResponse } from '../types/lastResults'

export async function fetchLastResults(): Promise<LastResultsResponse> {
  const res = await fetch('/api/results')
  if (!res.ok) throw new Error(`results request failed: ${res.status}`)
  const data: LastResultsResponse = await res.json()
  console.log('[results]', data)
  return data
}
