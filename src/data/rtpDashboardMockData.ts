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
  RtpStabilityData,
} from '../types/rtpDashboard'

// Mock TEMPORAL para el RTP Dashboard -- no existe todavía un servicio de RTP/payout
// configuration en el proyecto (sin api/store/types para RTP, bandas o house margin, ver
// investigación previa). Reemplazar este archivo por el fetch/store real no requiere tocar
// ningún componente: todos reciben estos datos por props.

// Logos reales por juego (pedido explícito: reemplazar los pictogramas genéricos rueda/dado por
// el logo de marca de cada uno -- ver 46_logo_option_2/49/51/43 en Website_svg_icons).
export const RTP_GAME_ICON_URLS: Record<RtpGame, string> = {
  roulette: buildMediaUrl('Website_svg_icons/46_logo_option_2.svg'),
  pick3: buildMediaUrl('Website_svg_icons/49_pick-3-logo-option-2.svg'),
  pick4: buildMediaUrl('Website_svg_icons/51_pick-4-logo-option-2.svg'),
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
    accent: 'green',
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
    accent: 'amber',
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

// RTP Stability -- trayectoria simulada del RTP acumulado (puente browniano con semilla fija: arranca
// ruidoso y converge, terminando exactamente en el "current" de RTP_METRIC_CARDS para que coincida
// con las KPI). sigma por juego aproxima la volatilidad de su mezcla de apuestas (Roulette baja-media;
// Pick 3/Pick 4 altas por sus premios grandes). correctionWindow = el de RTP Settings.
function stabilityRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function gaussian(random: () => number): number {
  return Math.sqrt(-2 * Math.log(random() || 1e-9)) * Math.cos(2 * Math.PI * random())
}

const STABILITY_POINTS = 120

function buildStability(target: number, current: number, sigma: number, totalRounds: number, correctionWindow: number, seed: number): RtpStabilityData {
  const random = stabilityRandom(seed)
  const step = totalRounds / STABILITY_POINTS
  const walk: number[] = []
  let w = 0
  for (let i = 1; i <= STABILITY_POINTS; i++) {
    w += gaussian(random) * Math.sqrt(step)
    walk.push(w)
  }
  const wEnd = walk[walk.length - 1]
  const finalDev = (current - target) / 100
  const points = walk.map((wi, idx) => {
    const n = step * (idx + 1)
    const bridge = wi - (n / totalRounds) * wEnd
    const dev = (sigma * bridge) / n + finalDev
    return { rounds: Math.round(n), rtp: Math.round((target + dev * 100) * 100) / 100 }
  })
  return { target, sigma, correctionWindow, points }
}

export const RTP_STABILITY_BY_GAME: Record<RtpGame, RtpStabilityData> = {
  roulette: buildStability(96, 95.2, 2.4, 60000, 20000, 96),
  pick3: buildStability(60, 61.4, 7.5, 36000, 15000, 333),
  pick4: buildStability(62, 62.1, 11, 32000, 15000, 4444),
}
