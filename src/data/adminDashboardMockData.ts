import { buildMediaUrl } from '../utils/media'
import type {
  AdminSidebarItem,
  AdminStatCardData,
  GameEventsOverTimePoint,
  GamePerformanceRow,
  GamesActivitySeriesPoint,
  GamesDistributionSegment,
  RecentRound,
  ResultFrequencyByGame,
  ResultFrequencyData,
  ResultFrequencyWindow,
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
  {
    id: 'settings',
    labelKey: 'admin.nav.settings',
    icon: buildMediaUrl('Website_svg_icons/17_gear_white.svg'),
    view: 'admin-settings',
  },
]

export const ADMIN_STAT_CARDS: AdminStatCardData[] = [
  {
    id: 'activeUsers',
    titleKey: 'admin.dashboard.kpi.activeUsers',
    value: '12',
    icon: buildMediaUrl('Website_svg_icons/36_users_green.svg'),
    accent: 'yellow',
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
  { id: 'r6', time: '14:15:28', game: 'pick4', result: [6, 1, 8, 4], roundNumber: '#0420' },
  { id: 'r7', time: '14:13:51', game: 'roulette', result: [32], roundNumber: '#0185' },
  { id: 'r8', time: '14:12:09', game: 'pick3', result: [9, 3, 7], roundNumber: '#0561' },
  { id: 'r9', time: '14:10:34', game: 'roulette', result: [5], roundNumber: '#0184' },
  { id: 'r10', time: '14:08:16', game: 'pick4', result: [0, 5, 2, 6], roundNumber: '#0419' },
]

// Wagers/payouts/GGR (USD) por juego -- sumados coinciden con las KPI de Reports que muestra el
// Dashboard (Total Payout $1,216,480, Gross Revenue $304,520), ggr = wagers - payouts.
export const GAME_PERFORMANCE: GamePerformanceRow[] = [
  { id: 'roulette', labelKey: 'admin.dashboard.gamesActivity.roulette', wagers: 912600, payouts: 730080, ggr: 182520 },
  { id: 'pick3', labelKey: 'admin.dashboard.gamesActivity.pick3', wagers: 312000, payouts: 249600, ggr: 62400 },
  { id: 'pick4', labelKey: 'admin.dashboard.gamesActivity.pick4', wagers: 296400, payouts: 236800, ggr: 59600 },
]

// Eventos por hora de las últimas 24h, por estado final (ver GameEventsOverTimeChart.tsx).
export const GAME_EVENTS_OVER_TIME: GameEventsOverTimePoint[] = [
  { time: '00:00', completed: 112, failed: 22, cancelled: 8 },
  { time: '01:00', completed: 125, failed: 20, cancelled: 9 },
  { time: '02:00', completed: 104, failed: 18, cancelled: 7 },
  { time: '03:00', completed: 90, failed: 17, cancelled: 7 },
  { time: '04:00', completed: 106, failed: 16, cancelled: 8 },
  { time: '05:00', completed: 128, failed: 18, cancelled: 9 },
  { time: '06:00', completed: 150, failed: 20, cancelled: 10 },
  { time: '07:00', completed: 192, failed: 21, cancelled: 11 },
  { time: '08:00', completed: 222, failed: 24, cancelled: 12 },
  { time: '09:00', completed: 245, failed: 26, cancelled: 12 },
  { time: '10:00', completed: 272, failed: 28, cancelled: 14 },
  { time: '11:00', completed: 280, failed: 29, cancelled: 15 },
  { time: '12:00', completed: 276, failed: 28, cancelled: 16 },
  { time: '13:00', completed: 336, failed: 30, cancelled: 16 },
  { time: '14:00', completed: 482, failed: 36, cancelled: 18 },
  { time: '15:00', completed: 396, failed: 32, cancelled: 17 },
  { time: '16:00', completed: 425, failed: 34, cancelled: 20 },
  { time: '17:00', completed: 462, failed: 36, cancelled: 24 },
  { time: '18:00', completed: 508, failed: 40, cancelled: 28 },
  { time: '19:00', completed: 542, failed: 42, cancelled: 30 },
  { time: '20:00', completed: 470, failed: 38, cancelled: 26 },
  { time: '21:00', completed: 410, failed: 34, cancelled: 22 },
  { time: '22:00', completed: 330, failed: 30, cancelled: 16 },
  { time: '23:00', completed: 278, failed: 26, cancelled: 14 },
]

export const SYSTEM_STATUS_SERVICES: SystemStatusService[] = [
  { id: 'rouletteEngine', nameKey: 'admin.dashboard.systemStatus.rouletteEngine', online: true },
  { id: 'lotteryEngine', nameKey: 'admin.dashboard.systemStatus.lotteryEngine', online: true },
  { id: 'database', nameKey: 'admin.dashboard.systemStatus.database', online: true },
  { id: 'recordingService', nameKey: 'admin.dashboard.systemStatus.recordingService', online: true },
  { id: 'api', nameKey: 'admin.dashboard.systemStatus.api', online: true },
]

// Result Frequency -- sorteos sintéticos con un PRNG con semilla (mulberry32) en vez de tablas
// escritas a mano: 1000 rondas por juego, determinísticas entre recargas. Cada ventana es un prefijo
// de las mismas 1000 rondas (las últimas 100 ⊂ las últimas 500 ⊂ las últimas 1000), igual que lo
// sería con datos reales.
const RESULT_FREQUENCY_WINDOWS: ResultFrequencyWindow[] = [100, 500, 1000]
const ROULETTE_POCKET_KEYS = ['0', '00', ...Array.from({ length: 36 }, (_, i) => String(i + 1))]
const PICK_DIGIT_KEYS = Array.from({ length: 10 }, (_, i) => String(i))

function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// draws[i] = índices (en `keys`) que salieron en la ronda i -- 1 por ronda en Roulette, 3/4 en Pick.
function buildFrequencyWindows(keys: string[], picksPerRound: number, seed: number): Record<ResultFrequencyWindow, ResultFrequencyData> {
  const random = seededRandom(seed)
  const maxRounds = Math.max(...RESULT_FREQUENCY_WINDOWS)
  const draws = Array.from({ length: maxRounds }, () => Array.from({ length: picksPerRound }, () => Math.floor(random() * keys.length)))

  const entries = RESULT_FREQUENCY_WINDOWS.map((rounds): [ResultFrequencyWindow, ResultFrequencyData] => {
    const counts = new Array<number>(keys.length).fill(0)
    for (const round of draws.slice(0, rounds)) for (const index of round) counts[index] += 1
    return [rounds, { rounds, draws: rounds * picksPerRound, buckets: keys.map((key, i) => ({ key, count: counts[i] })) }]
  })
  return Object.fromEntries(entries) as Record<ResultFrequencyWindow, ResultFrequencyData>
}

export const RESULT_FREQUENCY: ResultFrequencyByGame = {
  roulette: buildFrequencyWindows(ROULETTE_POCKET_KEYS, 1, 13),
  pick3: buildFrequencyWindows(PICK_DIGIT_KEYS, 3, 303),
  pick4: buildFrequencyWindows(PICK_DIGIT_KEYS, 4, 404),
}
