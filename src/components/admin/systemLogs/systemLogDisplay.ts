import type { TFunction } from 'i18next'
import { buildMediaUrl } from '../../../utils/media'
import type { SystemLogActorType, SystemLogEntry, SystemLogGame, SystemLogModule } from '../../../types/adminSystemLogs'

export const SYSTEM_LOG_MODULE_ICON_URLS: Record<SystemLogModule, string> = {
  games: buildMediaUrl('Website_svg_icons/46_logo_option_2.svg'),
  events: buildMediaUrl('Website_svg_icons/33_calendar_white.svg'),
  rtp: buildMediaUrl('Website_svg_icons/05_target_white.svg'),
  users: buildMediaUrl('Website_svg_icons/16_user_white_circle.svg'),
  reports: buildMediaUrl('Website_svg_icons/09_analytics_white.svg'),
  settings: buildMediaUrl('Website_svg_icons/17_gear_white.svg'),
  system: buildMediaUrl('Website_svg_icons/20_monitor_white.svg'),
}

// Logos de marca: un log de una ronda o del RTP de un juego muestra el logo del juego en la columna
// Module en vez del ícono genérico del módulo.
const SYSTEM_LOG_GAME_ICON_URLS: Record<SystemLogGame, string> = {
  roulette: buildMediaUrl('Website_svg_icons/46_logo_option_2.svg'),
  quickMoney: buildMediaUrl('Website_svg_icons/43_quick-money-logo.svg'),
}

// Persona para un usuario, monitor para el sistema o una máquina (no hay fotos de usuario).
const SYSTEM_LOG_HUMAN_ACTOR_ICON_URL = buildMediaUrl('Website_svg_icons/16_user_white_circle.svg')
const SYSTEM_LOG_SYSTEM_ACTOR_ICON_URL = buildMediaUrl('Website_svg_icons/20_monitor_white.svg')

export function systemLogActorIconUrl(actorType: SystemLogActorType): string {
  return actorType === 'USER' ? SYSTEM_LOG_HUMAN_ACTOR_ICON_URL : SYSTEM_LOG_SYSTEM_ACTOR_ICON_URL
}

export function systemLogModuleIconUrl(entry: SystemLogEntry): string {
  return entry.game ? SYSTEM_LOG_GAME_ICON_URLS[entry.game] : SYSTEM_LOG_MODULE_ICON_URLS[entry.module]
}

// Nombre visible del actor: el sistema no tiene nombre propio.
export function systemLogActorName(entry: SystemLogEntry, t: TFunction): string {
  return entry.actorType === 'SYSTEM' ? t('admin.systemLogs.actor.system') : entry.actor
}
