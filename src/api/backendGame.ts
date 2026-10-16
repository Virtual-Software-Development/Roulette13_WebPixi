import type { RtpGame } from '../types/rtpDashboard'

// Nombre del juego en las rutas/JSON de quick-money-backend (`juego`): Quick Money es 'lottery'.
export type BackendGame = 'roulette' | 'lottery'

export const BACKEND_GAME: Record<RtpGame, BackendGame> = {
  roulette: 'roulette',
  quickMoney: 'lottery',
}

// null si el backend manda un juego que esta app no conoce.
export function gameFromBackend(juego: string): RtpGame | null {
  if (juego === 'roulette') return 'roulette'
  if (juego === 'lottery') return 'quickMoney'
  return null
}
