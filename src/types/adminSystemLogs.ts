import type { StatusBadgeVariant } from './rtpDashboard'

// Módulos de la tabla log del backend (enum system_module), en minúscula para las claves de i18n.
export type SystemLogModule = 'games' | 'events' | 'rtp' | 'users' | 'reports' | 'settings' | 'system'

export const SYSTEM_LOG_MODULES: SystemLogModule[] = ['games', 'events', 'rtp', 'users', 'reports', 'settings', 'system']

// Quién hizo la acción (enum actor_type): un usuario del admin, el backend solo, o una máquina.
export type SystemLogActorType = 'USER' | 'SYSTEM' | 'MACHINE'

// Juego de la ronda/RTP a la que se refiere el log, si se refiere a una.
export type SystemLogGame = 'roulette' | 'quickMoney'

// Valor antes/después: un setting (system_log) o el target de RTP de un juego (field 'target_rtp').
export interface SystemLogChange {
  field: string
  before: string | null
  after: string | null
}

export interface SystemLogEntry {
  id: string
  timestamp: string
  actorType: SystemLogActorType
  // username del usuario o nombre de la máquina; vacío para el sistema.
  actor: string
  // Rol del usuario (admin, cashier, ...); vacío para sistema/máquina.
  actorRole: string
  module: SystemLogModule
  // Código de acción del backend (enum log_action) -- se muestra tal cual, es dato y no copy.
  action: string
  // null cuando el backend la oculta (corrección de RTP de una ronda todavía sin sortear).
  summary: string | null
  game: SystemLogGame | null
  roundCode: string | null
  targetUser: string | null
  rtpProfile: { name: string; event: string } | null
  change: SystemLogChange | null
}

// create -> azul, update -> verde, destructivo -> rojo, automático del sistema -> violeta,
// autenticación -> neutral, lectura/cambio de un resultado pendiente -> amarillo.
const SYSTEM_LOG_ACTION_VARIANT: Record<string, StatusBadgeVariant> = {
  CREATE_USER: 'info',
  UPDATE_USER: 'positive',
  DEACTIVATE_USER: 'danger',
  LOGIN: 'neutral',
  LOGOUT: 'neutral',
  EXPORT_DATA: 'purple',
  UPDATE_RESULT: 'warning',
  READ_PENDING_RESULT: 'warning',
  CREATE_EVENT: 'info',
  UPDATE_EVENT: 'positive',
  DELETE_EVENT: 'danger',
  UPDATE_RTP_TARGET: 'positive',
  GENERATE_REPORT: 'purple',
  UPDATE_SETTINGS: 'positive',
  ROUND_DRAWN: 'purple',
  ROUND_FAILED: 'danger',
  RTP_AUTO_CORRECTION: 'purple',
  RTP_PROFILE_EXPIRED: 'purple',
  MACHINE_OFFLINE: 'danger',
}

export function systemLogActionVariant(action: string): StatusBadgeVariant {
  return SYSTEM_LOG_ACTION_VARIANT[action] ?? 'neutral'
}

export const SYSTEM_LOG_ACTIONS: string[] = Object.keys(SYSTEM_LOG_ACTION_VARIANT)
