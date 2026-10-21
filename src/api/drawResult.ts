import type { DrawResultResponse } from '../types/drawResult'
import { env } from '../config/env'
import { serverNow } from '../time/serverClock'

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

export interface FetchDrawResultOptions {
  // Server time (ms) to keep asking until, instead of NOT_YET_EXECUTED_MAX_ATTEMPTS: a result the
  // backend generates late (or a backend that is restarting -- the request fails outright) still
  // reaches the round as long as it arrives before this instant.
  until?: number
}

export async function fetchDrawResult(drawNo: string, options: FetchDrawResultOptions = {}): Promise<DrawResultResponse> {
  const { until } = options
  const keepTrying = (attempt: number) =>
    until === undefined ? attempt < NOT_YET_EXECUTED_MAX_ATTEMPTS : serverNow() + NOT_YET_EXECUTED_RETRY_DELAY_MS < until

  let res: Response | null = null
  for (let attempt = 1; ; attempt++) {
    try {
      res = await fetchDrawResultOnce(drawNo)
    } catch (err) {
      // Backend unreachable: only worth retrying when there is a deadline to retry until.
      if (until === undefined || !keepTrying(attempt)) throw err
      res = null
    }
    if (res && res.status !== 409) break
    if (!keepTrying(attempt)) break
    await sleep(NOT_YET_EXECUTED_RETRY_DELAY_MS)
  }

  if (!res || !res.ok) throw new Error(`drawResult request failed: ${res ? res.status : 'unreachable'}`)
  const data: DrawResultResponse = await res.json()
  console.log('[drawResult]', data)
  return data
}
