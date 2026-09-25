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
    view: 'admin-system-logs',
  },
  {
    id: 'reports',
    labelKey: 'admin.nav.reports',
    icon: buildMediaUrl('Website_svg_icons/09_analytics_white.svg'),
    view: 'admin-reports',
  },
  // Antes un padre deshabilitado con 3 sub-items inertes (Roulette Library/Lottery Video Status/
  // Upload History, ninguno con `view`) -- ahora un solo ítem (mismo criterio que Reports/Users):
  // entra directo a Video Management, que resuelve las 3 secciones como tabs internos en vez de
  // 3 niveles de navegación (pedido explícito).
  {
    id: 'videos',
    labelKey: 'admin.nav.videos',
    icon: buildMediaUrl('Website_svg_icons/34_play_white.svg'),
    view: 'admin-videos-roulette',
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
    icon: buildMediaUrl('Website_svg_icons/46_logo_option_2.svg'),
    accent: 'red',
    trend: '+12%',
    trendDirection: 'up',
    trendLabelKey: 'admin.dashboard.kpi.vsYesterday',
  },
  // Antes dos cards separadas (Pick 3 Rounds / Pick 4 Rounds) -- unificadas en una sola (pedido
  // explícito: "pertenecen a Quick Money Rounds"), valor = suma de ambas (432+418), trend = promedio
  // ponderado de +8%/+5% redondeado. Usa el logo genérico de Quick Money, no el de un pick específico.
  {
    id: 'quickMoneyRounds',
    titleKey: 'admin.dashboard.kpi.quickMoneyRounds',
    value: '850',
    icon: buildMediaUrl('Website_svg_icons/43_quick-money-logo.svg'),
    accent: 'blue',
    trend: '+7%',
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

// quickMoney = pick3 + pick4 del dataset anterior (pedido explícito: ambos son Quick Money, mismo
// criterio que el admin-stat-card ya unificado) -- ej. 00:00: 22+14=36, 02:00: 30+20=50, etc.
export const GAMES_ACTIVITY_SERIES: GamesActivitySeriesPoint[] = [
  { time: '00:00', roulette: 38, quickMoney: 36 },
  { time: '02:00', roulette: 52, quickMoney: 50 },
  { time: '04:00', roulette: 61, quickMoney: 58 },
  { time: '06:00', roulette: 78, quickMoney: 74 },
  { time: '08:00', roulette: 104, quickMoney: 96 },
  { time: '10:00', roulette: 121, quickMoney: 112 },
  { time: '12:00', roulette: 118, quickMoney: 120 },
  { time: '14:00', roulette: 132, quickMoney: 130 },
  { time: '16:00', roulette: 145, quickMoney: 140 },
  { time: '18:00', roulette: 139, quickMoney: 150 },
  { time: '20:00', roulette: 150, quickMoney: 156 },
  { time: '22:00', roulette: 128, quickMoney: 136 },
]

export const GAMES_ACTIVITY_Y_MAX = 200
export const GAMES_ACTIVITY_Y_TICKS = [0, 50, 100, 150, 200]
export const GAMES_ACTIVITY_X_LABELS = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']

export const GAMES_DISTRIBUTION_TOTAL = 2137

// pick3 (432) + pick4 (418) = 850, mismo total que "Quick Money Rounds" en ADMIN_STAT_CARDS --
// porcentajes recalculados sobre 2137 para que sigan sumando 100.0% con 2 segmentos en vez de 3.
export const GAMES_DISTRIBUTION: GamesDistributionSegment[] = [
  {
    id: 'roulette',
    labelKey: 'admin.dashboard.gamesActivity.roulette',
    value: 1287,
    percent: 60.2,
    color: 'var(--admin-red)',
  },
  {
    id: 'quickMoney',
    labelKey: 'admin.dashboard.gamesActivity.quickMoney',
    value: 850,
    percent: 39.8,
    color: 'var(--admin-blue)',
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
