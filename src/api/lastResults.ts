import type { LastResultsResponse } from '../types/lastResults'
import { env } from '../config/env'

export async function fetchLastResults(): Promise<LastResultsResponse> {
  const res = await fetch('/api/results', { headers: { Authorization: `Bearer ${env.apiKey}` } })
  if (!res.ok) throw new Error(`results request failed: ${res.status}`)
  const data: LastResultsResponse = await res.json()
  console.log('[results]', data)
  return data
}
