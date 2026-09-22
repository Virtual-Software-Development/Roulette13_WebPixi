import type { RtpGame } from './rtpDashboard'

export type RtpManagementTab = 'settings' | 'simulator' | 'scheduling'

export interface RtpSettingsData {
  game: RtpGame
  targetRtp: number
  minBand: number
  maxBand: number
  correctionWindow: number
  // Cuando es true, correctionWindow se ignora y el cálculo de RTP usa TODAS las rondas
  // registradas en vez de una ventana fija -- pedido explícito: "que puedo hacer si quiero que
  // tome todos los spin". El número de correctionWindow no se pisa al activarlo, así que
  // desactivarlo restaura el valor de ventana que el usuario ya tenía configurado.
  correctionWindowUnlimited: boolean
  maxCorrectionPerEvent: number
  smoothingFactor: number
  // yyyy-mm-ddTHH:mm, formato nativo de <input type="datetime-local"> (hora local, sin timezone).
  effectiveDate: string
}

// Campos de RtpSettingsData que pueden quedar temporalmente bloqueados -- Correction Window/Max
// Correction/Smoothing Factor quedan afuera a propósito: hoy siempre son editables, nunca hay
// backend/modelo que los bloquee.
export type RtpSettingsLockableField = 'targetRtp' | 'minBand' | 'maxBand' | 'effectiveDate'

export interface RtpFieldLockInfo {
  locked: boolean
  // i18n key con la razón del bloqueo -- no un string plano, para poder mostrarla tanto en el
  // tooltip del campo como en el banner general sin duplicar copy. `unlockAt` queda listo para
  // cuando el backend real lo provea (ver rtpManagementMockData.ts) -- nunca se calcula/inventa acá.
  reasonKey: string
  unlockAt: string | null
}

export type RtpSettingsLockState = Record<RtpSettingsLockableField, RtpFieldLockInfo>

export type SimulationType = 'projectedResults'

export type VolatilityModel = 'standard' | 'conservative' | 'aggressive'

export interface RtpSimulationInput {
  game: RtpGame
  simulationType: SimulationType
  currentTargetRtp: number
  proposedTargetRtp: number
  sampleSize: number
  estimatedAverageBet: number
  volatilityModel: VolatilityModel
}

export type RtpSimulationRiskLevel = 'low' | 'medium' | 'high'

export interface RtpSimulationResult {
  currentRtp: number
  proposedRtp: number
  differencePp: number
  riskLevel: RtpSimulationRiskLevel
  totalBetsCount: number
  totalBetsAmount: number
  projectedPayout: number
  projectedHouseReturn: number
  expectedRtp: number
}

export type RtpProfileStatus = 'active' | 'scheduled' | 'expiringSoon' | 'expired' | 'disabled' | 'replaced'

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export const DAYS_OF_WEEK: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export interface RtpProfile {
  id: string
  name: string
  game: RtpGame
  targetRtp: number
  minBand: number
  maxBand: number
  // Texto ya formateado para la columna SCHEDULE de la tabla (ej. "Fri-Sun · 18:00-23:59") -- mock
  // visual, mismo criterio que RtpChange.dateTime/changedBy en rtpDashboardMockData.ts (strings
  // planos, no localizados, porque son datos, no copy de UI). Ya no hay un "Schedule Type"
  // separado: todo profile es siempre un rango de fechas (start/expires) con Active Days + una
  // franja horaria opcional, y este string resume esa combinación (ver RtpProfileForm.tsx).
  scheduleSummary: string
  start: string
  expires: string
  status: RtpProfileStatus
  createdBy: string
  lastUpdated: string
}

export type RtpProfileActivityEvent = 'activated' | 'expired' | 'disabled' | 'replaced' | 'scheduled' | 'edited'

// Estado del registro histórico -- deliberadamente separado de RtpProfileStatus: una fila de
// actividad describe un evento ya ocurrido ("Completed"), no el estado vigente de un profile.
export type RtpProfileActivityStatus = 'completed' | 'active' | 'expired'

export interface RtpProfileActivity {
  id: string
  profileName: string
  game: RtpGame
  event: RtpProfileActivityEvent
  activePeriod: string
  changedBy: string
  dateTime: string
  status: RtpProfileActivityStatus
}
