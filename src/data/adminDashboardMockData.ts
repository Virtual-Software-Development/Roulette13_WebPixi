import { buildMediaUrl } from '../utils/media'
import type {
  AdminSidebarItem,
  AdminStatCardData,
  GamesActivitySeriesPoint,
  GamesDistributionSegment,
  RecentRound,
  SystemStatusService,
} from '../types/adminDashboard'

// Mock TEMPORAL para el AdminDashboard -- no existe todavía un endpoint/store de estadísticas
// administrativas (lo más cercano hoy es /api/bets, que solo expone playersCount/totalBetAmount,
// ver useBetsSummaryStore). Reemplazar este archivo por el fetch/store real no requiere tocar
// ningún componente: todos reciben estos datos por props.

export const ADMIN_SIDEBAR_ITEMS: AdminSidebarItem[] = [
  {
    id: 'dashboard',
    labelKey: 'admin.nav.dashboard',
    icon: buildMediaUrl('Website_svg_icons/35_house_white.svg'),
    view: 'admin',
  },
  {
    id: 'gameEvents',
    labelKey: 'admin.nav.gameEvents',
    icon: buildMediaUrl('Website_svg_icons/33_calendar_white.svg'),
    view: 'admin-game-events',
  },
  {
    id: 'nextResults',
    labelKey: 'admin.nav.nextResults',
    icon: buildMediaUrl('Website_svg_icons/33_calendar_white.svg'),
    children: [
      { id: 'roulette', labelKey: 'admin.nav.roulette', view: 'admin-next-results' },
      { id: 'lottery', labelKey: 'admin.nav.lottery', view: 'admin-next-results-quick-money' },
    ],
  },
  {
    id: 'payouts',
    labelKey: 'admin.nav.payouts',
    icon: buildMediaUrl('Website_svg_icons/41_payouts.svg'),
    disabled: true,
  },
  {
    id: 'users',
    labelKey: 'admin.nav.users',
    icon: buildMediaUrl('Website_svg_icons/16_user_white_circle.svg'),
    view: 'admin-users',
  },
  {
    id: 'rtp',
    labelKey: 'admin.nav.rtp',
    icon: buildMediaUrl('Website_svg_icons/05_target_white.svg'),
    children: [
      { id: 'rtpDashboard', labelKey: 'admin.nav.rtpDashboard', view: 'admin-rtp-dashboard' },
      { id: 'rtpManagement', labelKey: 'admin.nav.rtpManagement', view: 'admin-rtp-management' },
    ],
  },
  {
    id: 'systemLogs',
    labelKey: 'admin.nav.systemLogs',
    icon: buildMediaUrl('Website_svg_icons/38_copy_documents_white.svg'),
    disabled: true,
  },
  {
    id: 'reports',
    labelKey: 'admin.nav.reports',
    icon: buildMediaUrl('Website_svg_icons/09_analytics_white.svg'),
    disabled: true,
  },
  {
    id: 'videos',
    labelKey: 'admin.nav.videos',
    icon: buildMediaUrl('Website_svg_icons/34_play_white.svg'),
    disabled: true,
    children: [
      { id: 'videosRouletteLibrary', labelKey: 'admin.nav.videosRouletteLibrary', indicator: true },
      { id: 'videosLotteryVideoStatus', labelKey: 'admin.nav.videosLotteryVideoStatus', indicator: true },
      { id: 'videosUploadHistory', labelKey: 'admin.nav.videosUploadHistory' },
    ],
  },
  {
    id: 'settings',
    labelKey: 'admin.nav.settings',
    icon: buildMediaUrl('Website_svg_icons/17_gear_white.svg'),
    view: 'admin-settings',
  },
]

export const ADMIN_STAT_CARDS: AdminStatCardData[] = [
  {
    id: 'rouletteRounds',
    titleKey: 'admin.dashboard.kpi.rouletteRounds',
    value: '1,287',
    icon: buildMediaUrl('Website_svg_icons/14_roulette_red.svg'),
    accent: 'red',
    trend: '+12%',
    trendDirection: 'up',
    trendLabelKey: 'admin.dashboard.kpi.vsYesterday',
  },
  {
    id: 'pick3Rounds',
    titleKey: 'admin.dashboard.kpi.pick3Rounds',
    value: '432',
    icon: buildMediaUrl('Website_svg_icons/13_dice_blue.svg'),
    accent: 'blue',
    trend: '+8%',
    trendDirection: 'up',
    trendLabelKey: 'admin.dashboard.kpi.vsYesterday',
  },
  {
    id: 'pick4Rounds',
    titleKey: 'admin.dashboard.kpi.pick4Rounds',
    value: '418',
    icon: buildMediaUrl('Website_svg_icons/44_dice_purple.svg'),
    accent: 'purple',
    trend: '+5%',
    trendDirection: 'up',
    trendLabelKey: 'admin.dashboard.kpi.vsYesterday',
  },
  {
    id: 'activeUsers',
    titleKey: 'admin.dashboard.kpi.activeUsers',
    value: '12',
    icon: buildMediaUrl('Website_svg_icons/36_users_green.svg'),
    accent: 'green',
    trend: '+2',
    trendDirection: 'up',
    trendLabelKey: 'admin.dashboard.kpi.onlineNow',
  },
]

export const GAMES_ACTIVITY_SERIES: GamesActivitySeriesPoint[] = [
  { time: '00:00', roulette: 38, pick3: 22, pick4: 14 },
  { time: '02:00', roulette: 52, pick3: 30, pick4: 20 },
  { time: '04:00', roulette: 61, pick3: 34, pick4: 24 },
  { time: '06:00', roulette: 78, pick3: 44, pick4: 30 },
  { time: '08:00', roulette: 104, pick3: 58, pick4: 38 },
  { time: '10:00', roulette: 121, pick3: 66, pick4: 46 },
  { time: '12:00', roulette: 118, pick3: 70, pick4: 50 },
  { time: '14:00', roulette: 132, pick3: 76, pick4: 54 },
  { time: '16:00', roulette: 145, pick3: 82, pick4: 58 },
  { time: '18:00', roulette: 139, pick3: 88, pick4: 62 },
  { time: '20:00', roulette: 150, pick3: 92, pick4: 64 },
  { time: '22:00', roulette: 128, pick3: 80, pick4: 56 },
]

export const GAMES_ACTIVITY_Y_MAX = 200
export const GAMES_ACTIVITY_Y_TICKS = [0, 50, 100, 150, 200]
export const GAMES_ACTIVITY_X_LABELS = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']

export const GAMES_DISTRIBUTION_TOTAL = 2137

export const GAMES_DISTRIBUTION: GamesDistributionSegment[] = [
  {
    id: 'roulette',
    labelKey: 'admin.dashboard.gamesActivity.roulette',
    value: 1287,
    percent: 60.3,
    color: 'var(--admin-red)',
  },
  {
    id: 'pick3',
    labelKey: 'admin.dashboard.gamesActivity.pick3',
    value: 432,
    percent: 20.2,
    color: 'var(--admin-blue)',
  },
  {
    id: 'pick4',
    labelKey: 'admin.dashboard.gamesActivity.pick4',
    value: 418,
    percent: 19.6,
    color: 'var(--admin-purple)',
  },
]

export const RECENT_ROUNDS: RecentRound[] = [
  { id: 'r1', time: '14:24:53', game: 'roulette', result: [17], roundNumber: '#0187' },
  { id: 'r2', time: '14:23:10', game: 'pick3', result: [8, 4, 1], roundNumber: '#0563' },
  { id: 'r3', time: '14:21:37', game: 'pick4', result: [2, 7, 3, 9], roundNumber: '#0421' },
  { id: 'r4', time: '14:19:02', game: 'roulette', result: [0], roundNumber: '#0186' },
  { id: 'r5', time: '14:17:45', game: 'pick3', result: [5, 0, 2], roundNumber: '#0562' },
]

export const SYSTEM_STATUS_SERVICES: SystemStatusService[] = [
  { id: 'rouletteEngine', nameKey: 'admin.dashboard.systemStatus.rouletteEngine', online: true },
  { id: 'lotteryEngine', nameKey: 'admin.dashboard.systemStatus.lotteryEngine', online: true },
  { id: 'database', nameKey: 'admin.dashboard.systemStatus.database', online: true },
  { id: 'recordingService', nameKey: 'admin.dashboard.systemStatus.recordingService', online: true },
  { id: 'api', nameKey: 'admin.dashboard.systemStatus.api', online: true },
]
