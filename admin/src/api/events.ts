import { apiFetch } from './client'

// Used only as a liveness check for the Dashboard's System Status panel -- true if the roulette
// event engine currently has a pending event scheduled (it always should, once running), false if
// that lookup 404s. We don't need the event's own fields for this.
export async function isRouletteEngineLive(): Promise<boolean> {
  const res = await apiFetch('/events/roulette/current')
  return res.ok
}

// Same liveness check, for the lottery clock (worker.RunLotteryClock).
export async function isLotteryEngineLive(): Promise<boolean> {
  const res = await apiFetch('/events/lottery/current')
  return res.ok
}
