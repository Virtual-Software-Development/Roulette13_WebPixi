import type { TFunction } from 'i18next'
import { GAME_LABEL_KEY } from './rtpGameLabels'
import type { GameEvent, GameEventStatus } from '../types/adminGameEvents'
import type { StatusBadgeVariant } from '../types/rtpDashboard'

export const GAME_EVENT_STATUS_VARIANT: Record<GameEventStatus, StatusBadgeVariant> = {
  scheduled: 'neutral',
  bettingOpen: 'warning',
  bettingClosed: 'purple',
  live: 'info',
  completed: 'positive',
  failed: 'danger',
  cancelled: 'neutral',
}

// game -> StatusBadgeVariant reutilizando las variantes ya existentes (ver StatusBadge.tsx) --
// roulette=red(danger) y quickMoney=verde(positive), colores reales de marca de cada uno (ver
// quickMoneyLobbyTokens.css).
export const GAME_EVENT_GAME_VARIANT: Record<GameEvent['game'], StatusBadgeVariant> = {
  roulette: 'danger',
  quickMoney: 'positive',
}

export const GAME_EVENT_STATUSES: GameEventStatus[] = ['scheduled', 'bettingOpen', 'bettingClosed', 'live', 'completed', 'failed', 'cancelled']

// "Roulette #0533" -- las rondas no tienen nombre propio en el backend.
export function gameEventName(event: GameEvent, t: TFunction): string {
  return t('admin.gameEvents.roundName', { game: t(GAME_LABEL_KEY[event.game]), number: event.number })
}
