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
  // yyyy-mm-dd: desde cuándo rige la configuración actual. Solo lectura -- el backend aplica cada
  // cambio de inmediato (a las rondas que todavía no congelaron resultado) y fecha el cambio hoy.
  effectiveDate: string
}

export type SimulationType = 'projectedResults'

export type RtpSimulationRiskLevel = 'low' | 'medium' | 'high'

// Resultado del sandbox del backend (ver api/rtpSimulator.ts) -- montos y RTP salen de rondas
// jugadas por el motor real; riskLevel se mide por el tamaño del cambio propuesto y withinBand es
// el veredicto de la prueba (RTP simulado dentro de [minBand, maxBand]).
export interface RtpSimulationResult {
  // Escenario del backend que quedó con las rondas jugadas -- de ahí se descarga el CSV. Quien
  // recibe el resultado lo borra (deleteRtpSimScenario) cuando ya no lo necesita.
  scenarioId: string
  currentRtp: number
  proposedRtp: number
  differencePp: number
  riskLevel: RtpSimulationRiskLevel
  engine: string
  rounds: number
  roundsWithinBandPct: number
  totalBetsCount: number
  totalBetsAmount: number
  projectedPayout: number
  projectedHouseReturn: number
  simulatedRtp: number
  minBand: number
  maxBand: number
  withinBand: boolean
  // RTP simulado − RTP objetivo propuesto, en puntos porcentuales.
  deviationPp: number
}

export type RtpProfileStatus = 'active' | 'scheduled' | 'expiringSoon' | 'expired' | 'disabled' | 'replaced'

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export const DAYS_OF_WEEK: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

// Fila de GET /rtp-profiles. Fechas yyyy-mm-dd (días de la operación, ambos inclusive) y horas
// HH:MM[:SS]; status lo calcula el backend en cada lectura ('replaced' todavía no lo produce).
export interface RtpProfile {
  id: number
  name: string
  game: RtpGame
  targetRtp: number
  minBand: number
  maxBand: number
  activeDays: DayOfWeek[]
  restrictHours: boolean
  startTime: string | null
  endTime: string | null
  startDate: string
  expiresDate: string
  status: RtpProfileStatus
  createdBy: string
  updatedAt: string
}

// Cuerpo de POST /rtp-profiles.
export interface NewRtpProfile {
  name: string
  game: RtpGame
  targetRtp: number
  minBand: number
  maxBand: number
  activeDays: DayOfWeek[]
  restrictHours: boolean
  startTime: string | null
  endTime: string | null
  startDate: string
  expiresDate: string
}

export type RtpProfileActivityEvent = 'created' | 'activated' | 'expired' | 'disabled' | 'replaced' | 'edited'

// Fila de GET /rtp-profile-events, con el período del profile al momento de leer.
export interface RtpProfileActivity {
  id: number
  profileName: string
  game: RtpGame
  event: RtpProfileActivityEvent
  startDate: string
  expiresDate: string
  startTime: string | null
  endTime: string | null
  changedBy: string
  // ISO 8601
  dateTime: string
}
