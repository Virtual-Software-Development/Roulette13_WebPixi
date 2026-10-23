// Programming (GET/PUT /programming, POST /programming/preview): when each game is drawn. Times
// of the day are 'HH:MM' in Santo Domingo time (UTC-4); durations in seconds before the draw.

export type ProgrammingGameKey = 'roulette' | 'quickMoney'

export interface ProgrammingGame {
  dailyTimes: string[]
  bettingCloseSeconds: number
  // An admin may change the result (Next Results) until this long before the draw.
  resultChangeSeconds: number
  isActive: boolean
}

export interface Programming {
  horizonDays: number
  roulette: ProgrammingGame
  quickMoney: ProgrammingGame
}

export interface ProgrammingLimits {
  runTimeSeconds: number
  minBettingCloseSeconds: number
  maxBettingCloseSeconds: number
  minResultChangeSeconds: number
  minHorizonDays: number
  maxHorizonDays: number
  maxTimesPerDay: number
}

// keep: an existing round that stays; update: it gets the new cutoffs; create: planned, not created
// yet; cancel: removed by the change (no tickets); blocked: the change would remove it but it has
// tickets (the change is refused); skip: a roulette time left out for a Quick Money draw.
export type PlannedRoundAction = 'keep' | 'update' | 'create' | 'cancel' | 'blocked' | 'skip'

export interface PlannedRound {
  juego: 'roulette' | 'lottery'
  drawAt: string
  bettingClosesAt: string
  resultChangeUntil: string
  action: PlannedRoundAction
  eventId?: number
  drawNo?: string
  estado?: string
  skippedFor?: string
}

export interface ProgrammingSummary {
  keep: number
  update: number
  create: number
  cancel: number
  blocked: number
  skip: number
}

export interface ProgrammingView {
  programming: Programming
  limits: ProgrammingLimits
  timeZone: string
  rounds: PlannedRound[]
  summary: ProgrammingSummary
}

export interface ProgrammingSaveResult {
  view: ProgrammingView
  created: number
  updated: number
  cancelled: number
}
