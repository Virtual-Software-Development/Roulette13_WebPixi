import type { RtpGame } from '../types/rtpDashboard'

// Centraliza el mapeo juego -> i18n key (RECENT_ROUNDS, RTP_BANDS, RtpChange ya usaban esta misma
// key `admin.dashboard.gamesActivity.*` -- ver rtpDashboardMockData.ts/RecentRtpChanges.tsx)
// para no repetirlo en cada componente de RTP Management (Settings/Simulator/Scheduling).
export const GAME_LABEL_KEY: Record<RtpGame, string> = {
  roulette: 'admin.dashboard.gamesActivity.roulette',
  pick3: 'admin.dashboard.gamesActivity.pick3',
  pick4: 'admin.dashboard.gamesActivity.pick4',
}

export const RTP_GAMES: RtpGame[] = ['roulette', 'pick3', 'pick4']
