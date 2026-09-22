import { buildMediaUrl } from '../utils/media'
import type {
  HouseMarginData,
  ManualOverridesData,
  RtpBand,
  RtpChange,
  RtpGame,
  RtpHistoryPoint,
  RtpMetricCardData,
  RtpTrendRange,
} from '../types/rtpDashboard'

// Mock TEMPORAL para el RTP Dashboard -- no existe todavía un servicio de RTP/payout
// configuration en el proyecto (sin api/store/types para RTP, bandas o house margin, ver
// investigación previa). Reemplazar este archivo por el fetch/store real no requiere tocar
// ningún componente: todos reciben estos datos por props.

export const RTP_GAME_ICON_URLS: Record<RtpGame, string> = {
  roulette: buildMediaUrl('Website_svg_icons/14_roulette_red.svg'),
  pick3: buildMediaUrl('Website_svg_icons/13_dice_blue.svg'),
  pick4: buildMediaUrl('Website_svg_icons/44_dice_purple.svg'),
}

export const RTP_METRIC_CARDS: RtpMetricCardData[] = [
  {
    id: 'roulette',
    titleKey: 'admin.rtp.metrics.rouletteTitle',
    icon: RTP_GAME_ICON_URLS.roulette,
    accent: 'red',
    current: 95.2,
    target: 96,
    statusLabelKey: 'admin.rtp.status.withinBand',
    statusVariant: 'positive',
    statusIcon: 'check',
  },
  {
    id: 'pick3',
    titleKey: 'admin.rtp.metrics.pick3Title',
    icon: RTP_GAME_ICON_URLS.pick3,
    accent: 'blue',
    current: 61.4,
    target: 60,
    statusLabelKey: 'admin.rtp.status.aboveTarget',
    statusVariant: 'positive',
    statusIcon: 'up',
  },
  {
    id: 'pick4',
    titleKey: 'admin.rtp.metrics.pick4Title',
    icon: RTP_GAME_ICON_URLS.pick4,
    accent: 'purple',
    current: 62.1,
    target: 62,
    statusLabelKey: 'admin.rtp.status.onTarget',
    statusVariant: 'info',
    statusIcon: 'dot',
  },
]

export const HOUSE_MARGIN: HouseMarginData = {
  icon: buildMediaUrl('Website_svg_icons/06_gold_chips_stack.svg'),
  value: '$48,921.37',
  trend: '12.6%',
  trendDirection: 'up',
  trendLabelKey: 'admin.rtp.houseMargin.trendLabel',
}

export const MANUAL_OVERRIDES: ManualOverridesData = {
  icon: buildMediaUrl('Website_svg_icons/22_shield_check_gold_thinner.svg'),
  value: 2,
}

// Genera una serie por rango (7/14/21/30 días) en vez de un único array fijo -- el selector de
// Actual vs Target RTP (ver RtpTrendChart.tsx) necesita datos de largo distinto por opción. El
// último día de CADA rango queda anclado exactamente a los valores "current" de RTP_METRIC_CARDS
// (95.2/61.4/62.1), para que el punto más reciente del chart siempre coincida con lo que muestran
// las KPI cards de arriba, sea cual sea el rango elegido.
const RTP_TREND_RANGE_DAYS: Record<RtpTrendRange, number> = {
  last7Days: 7,
  twoWeeks: 14,
  threeWeeks: 21,
  oneMonth: 30,
}

// timeZone:'UTC' explícito -- las fechas se construyen con Date.UTC/setUTCDate (ver
// buildRtpHistory) para que el cálculo sea determinista; sin fijar la timezone acá, formatear con
// la timezone local del navegador corre el riesgo de mostrar el día anterior/siguiente según el
// offset del viewer (ej. "Sep 3" en vez de "Sep 4" para alguien en UTC-4).
const HISTORY_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

// Mismo "hoy" mockeado que usa RTP_CHANGES (Sep 4, 2026).
const HISTORY_END_DATE = new Date(Date.UTC(2026, 8, 4))

interface HistorySeriesSpec {
  key: keyof Omit<RtpHistoryPoint, 'date'>
  current: number
  amplitude: number
  frequency: number
  phase: number
}

const HISTORY_SERIES_SPECS: HistorySeriesSpec[] = [
  { key: 'rouletteActual', current: 95.2, amplitude: 0.9, frequency: 0.55, phase: 0.4 },
  { key: 'rouletteTarget', current: 96, amplitude: 0, frequency: 0, phase: 0 },
  { key: 'pick3Actual', current: 61.4, amplitude: 1.2, frequency: 0.7, phase: 1.6 },
  { key: 'pick3Target', current: 60, amplitude: 0, frequency: 0, phase: 0 },
  { key: 'pick4Actual', current: 62.1, amplitude: 1.0, frequency: 0.45, phase: 2.8 },
  { key: 'pick4Target', current: 62, amplitude: 0, frequency: 0, phase: 0 },
]

// value(lastDayIndex) siempre da `current` exacto -- el resto de los días oscila alrededor con
// una onda suave (más creíble para un chart que ruido random, y estable entre renders).
function seriesValueAt(spec: HistorySeriesSpec, dayIndex: number, lastDayIndex: number): number {
  if (spec.amplitude === 0) return spec.current
  const offsetAtToday = spec.amplitude * Math.sin(spec.frequency * lastDayIndex + spec.phase)
  return spec.current - offsetAtToday + spec.amplitude * Math.sin(spec.frequency * dayIndex + spec.phase)
}

function buildRtpHistory(days: number): RtpHistoryPoint[] {
  const lastDayIndex = days - 1
  return Array.from({ length: days }, (_, dayIndex) => {
    const date = new Date(HISTORY_END_DATE)
    date.setUTCDate(date.getUTCDate() - (lastDayIndex - dayIndex))
    const point = { date: HISTORY_DATE_FORMATTER.format(date) } as RtpHistoryPoint
    for (const spec of HISTORY_SERIES_SPECS) {
      point[spec.key] = Math.round(seriesValueAt(spec, dayIndex, lastDayIndex) * 10) / 10
    }
    return point
  })
}

export const RTP_HISTORY_BY_RANGE: Record<RtpTrendRange, RtpHistoryPoint[]> = {
  last7Days: buildRtpHistory(RTP_TREND_RANGE_DAYS.last7Days),
  twoWeeks: buildRtpHistory(RTP_TREND_RANGE_DAYS.twoWeeks),
  threeWeeks: buildRtpHistory(RTP_TREND_RANGE_DAYS.threeWeeks),
  oneMonth: buildRtpHistory(RTP_TREND_RANGE_DAYS.oneMonth),
}

export const RTP_BANDS: RtpBand[] = [
  { id: 'roulette', labelKey: 'admin.dashboard.gamesActivity.roulette', min: 92, max: 98, widthPercent: 6 },
  { id: 'pick3', labelKey: 'admin.dashboard.gamesActivity.pick3', min: 58, max: 62, widthPercent: 4 },
  { id: 'pick4', labelKey: 'admin.dashboard.gamesActivity.pick4', min: 60, max: 64, widthPercent: 4 },
]

export const RTP_CHANGES: RtpChange[] = [
  {
    id: 'c1',
    game: 'roulette',
    previousTarget: 95.5,
    newTarget: 96,
    changedBy: 'System Auto Balance',
    dateTime: 'Sep 4, 2026 02:00:11',
    status: 'autoApplied',
  },
  {
    id: 'c2',
    game: 'pick3',
    previousTarget: 60,
    newTarget: 60,
    changedBy: 'System Auto Balance',
    dateTime: 'Sep 4, 2026 02:00:11',
    status: 'autoApplied',
  },
  {
    id: 'c3',
    game: 'pick4',
    previousTarget: 61.5,
    newTarget: 62,
    changedBy: 'System Auto Balance',
    dateTime: 'Sep 4, 2026 02:00:11',
    status: 'autoApplied',
  },
  {
    id: 'c4',
    game: 'pick3',
    previousTarget: 59.5,
    newTarget: 60,
    changedBy: 'Admin',
    dateTime: 'Sep 2, 2026 13:47:32',
    status: 'applied',
  },
  {
    id: 'c5',
    game: 'roulette',
    previousTarget: 95,
    newTarget: 95.5,
    changedBy: 'Admin',
    dateTime: 'Sep 1, 2026 17:22:08',
    status: 'applied',
  },
]

export const RTP_CHANGES_TOTAL_COUNT = RTP_CHANGES.length
