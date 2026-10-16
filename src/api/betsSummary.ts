import type { BetsSummaryResponse } from '../types/betsSummary'
import { env } from '../config/env'

const MAX_RETRIES = 5
const RETRY_DELAY_MS = 1000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchBetsSummaryOnce(drawNo?: string): Promise<BetsSummaryResponse> {
  const url = drawNo ? `/api/bets?drawNo=${encodeURIComponent(drawNo)}` : '/api/bets'
  const res = await fetch(url, { headers: { Authorization: `Bearer ${env.apiKey}` } })
  if (!res.ok) throw new Error(`bets request failed: ${res.status}`)
  return res.json()
}

// A diferencia del resto de src/api (sin retry) -- pedido explícito: esta consulta se hace una
// sola vez por ronda (10s antes del video, ver BETS_LEAD_MS en App.tsx) y no hay una segunda
// ventana de oportunidad si falla, así que reintenta hasta MAX_RETRIES veces antes de resignarse.
// Sin drawNo: el sorteo pendiente. Con drawNo: los totales de ESE sorteo (al arrancar el lobby, los
// del sorteo anterior, que es lo que las demás máquinas siguen mostrando).
export async function fetchBetsSummary(drawNo?: string): Promise<BetsSummaryResponse> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchBetsSummaryOnce(drawNo)
    } catch (err) {
      lastError = err
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS)
    }
  }
  throw lastError
}
