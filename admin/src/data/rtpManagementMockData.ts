import type { RtpGame } from '../types/rtpDashboard'
import type {
  RtpProfile,
  RtpProfileActivity,
  RtpSettingsData,
  RtpSettingsLockState,
  RtpSimulationInput,
  RtpSimulationResult,
  SimulationType,
  VolatilityModel,
} from '../types/rtpManagement'

// Mock TEMPORAL para RTP Management -- igual que rtpDashboardMockData.ts, no existe todavía un
// servicio de RTP settings/simulator/scheduling en el proyecto (ver investigación previa: sin
// api/store/types para esto). Reemplazar este archivo por el fetch/store real no requiere tocar
// ningún componente: todos reciben estos datos por props.

export const SIMULATION_TYPE_OPTIONS: SimulationType[] = ['projectedResults']

export const VOLATILITY_MODEL_OPTIONS: VolatilityModel[] = ['standard', 'conservative', 'aggressive']

// Mismos valores "current" que RTP_METRIC_CARDS/RTP_BANDS en rtpDashboardMockData.ts (roulette
// 94.74/92-98, pick3 60/58-62, pick4 62/60-64) -- RTP Settings y RTP Dashboard describen el mismo
// estado de configuración, solo que Settings lo hace editable.
export const RTP_SETTINGS_BY_GAME: Record<RtpGame, RtpSettingsData> = {
  roulette: {
    game: 'roulette',
    targetRtp: 94.74,
    minBand: 92,
    maxBand: 98,
    correctionWindow: 20000,
    correctionWindowUnlimited: false,
    maxCorrectionPerEvent: 20,
    smoothingFactor: 0.1,
    effectiveDate: '2026-09-04T00:00',
  },
  pick3: {
    game: 'pick3',
    targetRtp: 60,
    minBand: 58,
    maxBand: 62,
    correctionWindow: 15000,
    correctionWindowUnlimited: false,
    maxCorrectionPerEvent: 15,
    smoothingFactor: 0.12,
    effectiveDate: '2026-09-04T00:00',
  },
  pick4: {
    game: 'pick4',
    targetRtp: 62,
    minBand: 60,
    maxBand: 64,
    correctionWindow: 15000,
    correctionWindowUnlimited: false,
    maxCorrectionPerEvent: 15,
    smoothingFactor: 0.12,
    effectiveDate: '2026-09-04T00:00',
  },
}

// Estado de bloqueo de RTP Settings -- sin API/store real todavía (mismo motivo que el resto de
// este archivo), pero modelado como dato en vez de un `disabled` suelto en el JSX: el día que
// exista un endpoint real, este objeto es lo único que hay que reemplazar por la respuesta del
// servidor, ningún componente necesita cambiar (ver RtpSettingsPanel.tsx, que solo lee `.locked`/
// `.reasonKey`/`.unlockAt`). Los 4 campos comparten hoy la misma razón (la configuración RTP
// activa) -- `unlockAt: null` porque no tenemos ninguna fecha real de desbloqueo: no se inventa.
export const RTP_SETTINGS_LOCK_REASON_KEY = 'admin.rtp.management.settings.lock.reason'

export const RTP_SETTINGS_LOCK_STATE: RtpSettingsLockState = {
  targetRtp: { locked: true, reasonKey: RTP_SETTINGS_LOCK_REASON_KEY, unlockAt: null },
  minBand: { locked: true, reasonKey: RTP_SETTINGS_LOCK_REASON_KEY, unlockAt: null },
  maxBand: { locked: true, reasonKey: RTP_SETTINGS_LOCK_REASON_KEY, unlockAt: null },
  effectiveDate: { locked: true, reasonKey: RTP_SETTINGS_LOCK_REASON_KEY, unlockAt: null },
}

function riskLevelFor(differencePp: number): RtpSimulationResult['riskLevel'] {
  const abs = Math.abs(differencePp)
  if (abs < 0.5) return 'low'
  if (abs < 1.5) return 'medium'
  return 'high'
}

// Calculo puro -- Simulator solo proyecta, nunca escribe RTP_SETTINGS_BY_GAME (pedido explícito:
// "Simulator NO debe guardar cambios automáticamente"). totalBets/projectedPayout/houseReturn se
// derivan de sampleSize * estimatedAverageBet con el proposedTargetRtp como payout ratio.
export function runRtpSimulation(input: RtpSimulationInput): RtpSimulationResult {
  const differencePp = Math.round((input.proposedTargetRtp - input.currentTargetRtp) * 100) / 100
  const totalBetsAmount = input.sampleSize * input.estimatedAverageBet
  const projectedPayout = Math.round(totalBetsAmount * (input.proposedTargetRtp / 100) * 100) / 100
  const projectedHouseReturn = Math.round((totalBetsAmount - projectedPayout) * 100) / 100

  return {
    currentRtp: input.currentTargetRtp,
    proposedRtp: input.proposedTargetRtp,
    differencePp,
    riskLevel: riskLevelFor(differencePp),
    totalBetsCount: input.sampleSize,
    totalBetsAmount,
    projectedPayout,
    projectedHouseReturn,
    expectedRtp: input.proposedTargetRtp,
  }
}

export const RTP_PROFILES: RtpProfile[] = [
  {
    id: 'p1',
    name: 'Weekend Boost',
    game: 'roulette',
    targetRtp: 95.5,
    minBand: 92,
    maxBand: 98,
    scheduleSummary: 'Fri-Sun · 18:00-23:59',
    start: 'Sep 18, 2026',
    expires: 'Sep 21, 2026',
    status: 'scheduled',
    createdBy: 'Admin',
    lastUpdated: 'Sep 10, 2026 09:12',
  },
  {
    id: 'p2',
    name: 'Evening Pick 3',
    game: 'pick3',
    targetRtp: 60.5,
    minBand: 58,
    maxBand: 62,
    scheduleSummary: 'Daily · 18:00-22:00',
    start: 'Sep 10, 2026',
    expires: 'Oct 10, 2026',
    status: 'active',
    createdBy: 'Admin',
    lastUpdated: 'Sep 10, 2026 08:40',
  },
  {
    id: 'p3',
    name: 'Summer Campaign',
    game: 'pick4',
    targetRtp: 62.0,
    minBand: 60,
    maxBand: 64,
    // Ya no hay tipo "campaign" separado -- el nombre del profile transmite que es una campaña,
    // el schedule sigue siendo un rango de fechas normal, activo todos los días.
    scheduleSummary: 'Daily',
    start: 'Aug 1, 2026',
    expires: 'Sep 30, 2026',
    status: 'active',
    createdBy: 'System Scheduler',
    lastUpdated: 'Aug 1, 2026 00:00',
  },
]

export const RTP_PROFILE_ACTIVITY: RtpProfileActivity[] = [
  {
    id: 'a1',
    profileName: 'Weekend Boost',
    game: 'roulette',
    event: 'activated',
    activePeriod: 'Sep 12 18:00 → Sep 14 23:59',
    changedBy: 'System Scheduler',
    dateTime: 'Sep 12, 2026 18:00',
    status: 'completed',
  },
  {
    id: 'a2',
    profileName: 'Evening Pick 3',
    game: 'pick3',
    event: 'activated',
    activePeriod: '18:00 → 22:00',
    changedBy: 'System Scheduler',
    dateTime: 'Sep 15, 2026 18:00',
    status: 'active',
  },
  {
    id: 'a3',
    profileName: 'Promo RTP',
    game: 'pick4',
    event: 'expired',
    activePeriod: 'Sep 1 → Sep 15',
    changedBy: 'System Scheduler',
    dateTime: 'Sep 15, 2026 00:00',
    status: 'expired',
  },
]
