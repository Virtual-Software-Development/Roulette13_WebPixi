import type { GameInfoResponse } from '../types/gameInfo'

export async function fetchGameInfo(): Promise<GameInfoResponse> {
  const res = await fetch('/api/gameInfo')
  if (!res.ok) throw new Error(`gameInfo request failed: ${res.status}`)
  const data: GameInfoResponse = await res.json()
  console.log('[gameInfo]', data)
  return data
}
