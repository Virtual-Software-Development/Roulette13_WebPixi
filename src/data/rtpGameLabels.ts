import { buildMediaUrl } from '../utils/media'
import type { RtpGame } from '../types/rtpDashboard'

// Centraliza el mapeo juego -> i18n key (`admin.dashboard.gamesActivity.*`) para no repetirlo en
// cada componente del RTP Dashboard y de RTP Management (Settings/Simulator/Scheduling).
export const GAME_LABEL_KEY: Record<RtpGame, string> = {
  roulette: 'admin.dashboard.gamesActivity.roulette',
  quickMoney: 'admin.dashboard.gamesActivity.quickMoney',
}

export const RTP_GAMES: RtpGame[] = ['roulette', 'quickMoney']

// Logo de marca de cada juego (46_logo_option_2/43 en Website_svg_icons).
export const RTP_GAME_ICON_URLS: Record<RtpGame, string> = {
  roulette: buildMediaUrl('Website_svg_icons/46_logo_option_2.svg'),
  quickMoney: buildMediaUrl('Website_svg_icons/43_quick-money-logo.svg'),
}
