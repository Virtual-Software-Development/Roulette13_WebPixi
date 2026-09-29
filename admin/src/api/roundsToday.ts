import { apiFetch } from './client'

// GET /rounds-today/{juego} -- the real, uncapped "rounds today" count for a
// stat card. Deliberately NOT derived from /roulette or /lottery last-results
// (those feed vw_*_last_results, capped at 100 rows regardless of how many
// rounds have actually run -- see internal/events/repository.go's
// CountRouletteRoundsToday), and scoped to today specifically to match each
// card's own "vs. yesterday" label.
export async function fetchRoundsToday(juego: 'roulette' | 'pick3' | 'pick4'): Promise<number> {
  const res = await apiFetch(`/rounds-today/${juego}`)
  if (!res.ok) throw new Error(`rounds-today/${juego} fetch failed: ${res.status}`)
  const body: { count: number } = await res.json()
  return body.count
}
