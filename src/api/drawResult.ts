import type { DrawResultResponse } from '../types/drawResult'
import { env } from '../config/env'

// The backend executes the event resultRevealLead (2s) before hora_programada, well before this
// call fires 500ms before it -- normally a safe 1.5s margin. But roulette and lottery share a
// reveal lock (see worker.RevealCoordinator) that can occasionally delay execution by up to a
// couple of ticks, and the event legitimately answers 409 ("todavía no se ejecutó") until that
// happens. A few short retries absorb that race instead of breaking the round's video outright.
const NOT_YET_EXECUTED_RETRY_DELAY_MS = 300
const NOT_YET_EXECUTED_MAX_ATTEMPTS = 8

async function fetchDrawResultOnce(drawNo: string): Promise<Response> {
  return fetch(`/api/drawResult?drawNo=${encodeURIComponent(drawNo)}`, {
    headers: { Authorization: `Bearer ${env.apiKey}` },
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchDrawResult(drawNo: string): Promise<DrawResultResponse> {
  let res = await fetchDrawResultOnce(drawNo)

  for (let attempt = 1; res.status === 409 && attempt < NOT_YET_EXECUTED_MAX_ATTEMPTS; attempt++) {
    await sleep(NOT_YET_EXECUTED_RETRY_DELAY_MS)
    res = await fetchDrawResultOnce(drawNo)
  }

  if (!res.ok) throw new Error(`drawResult request failed: ${res.status}`)
  const data: DrawResultResponse = await res.json()
  console.log('[drawResult]', data)
  return data
}
