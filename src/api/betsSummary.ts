import type { BetsSummaryResponse } from '../types/betsSummary'

const MAX_RETRIES = 5
const RETRY_DELAY_MS = 1000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchBetsSummaryOnce(): Promise<BetsSummaryResponse> {
  const res = await fetch('/api/bets')
  if (!res.ok) throw new Error(`bets request failed: ${res.status}`)
  const data: BetsSummaryResponse = await res.json()
  console.log('[bets]', data)
  return data
}

// A diferencia del resto de src/api (sin retry) -- pedido explícito: esta consulta se hace una
// sola vez por ronda (10s antes del video, ver BETS_LEAD_MS en App.tsx) y no hay una segunda
// ventana de oportunidad si falla, así que reintenta hasta MAX_RETRIES veces antes de resignarse.
export async function fetchBetsSummary(): Promise<BetsSummaryResponse> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchBetsSummaryOnce()
    } catch (err) {
      lastError = err
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS)
    }
  }
  throw lastError
}
