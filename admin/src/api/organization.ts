import { apiFetch } from './client'

// GET /machines/active-count -- "Active Users" for the dashboard. There are
// no player accounts in this system (tickets are anonymous, terminals are
// the actual actors), so this counts distinct machines that issued a ticket
// within the backend's trailing window (see organization.Handler.activeWindow).
export async function fetchActiveMachineCount(): Promise<number> {
  const res = await apiFetch('/machines/active-count')
  if (!res.ok) throw new Error(`machines/active-count fetch failed: ${res.status}`)
  const body: { count: number } = await res.json()
  return body.count
}
