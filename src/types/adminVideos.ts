export type VideoManagementTab = 'roulette' | 'quickMoney' | 'uploadHistory'

export interface VideoValidationLogEntry {
  id: string
  timestamp: string
  message: string
}

// ---------------------------------------------------------------------------------------------
// Roulette Video Library -- un asset por número/variante (Videos/<número>/<archivo>, ver
// utils/media.ts: fetchVideoFilesForNumber). `filename`/métricas de archivo quedan en null cuando
// no hay archivo (status='missing').
export type RouletteVideoStatus = 'available' | 'missing' | 'invalid' | 'pendingScan'
export type RouletteVideoValidation = 'passed' | 'failed' | 'pending' | 'notApplicable'

export interface RouletteVideoAsset {
  id: string
  resultNumber: string
  variant: string
  filename: string | null
  status: RouletteVideoStatus
  validation: RouletteVideoValidation
  fileSizeMb: number | null
  durationSeconds: number | null
  resolution: string | null
  codec: string | null
  lastVerifiedAt: string
  checksum: string | null
  validationLog: VideoValidationLogEntry[]
}

export interface RouletteVideoSummary {
  expectedAssets: number
  available: number
  missing: number
  invalid: number
  storageUsedGb: number
  storageTotalGb: number
}

// ---------------------------------------------------------------------------------------------
// Quick Money Video Status -- videos de sorteo (Pick 3/Pick 4), un row por draw programado. No es
// una library de assets fijos como Roulette: cada draw es un evento con deadline propio.
export type QuickMoneyDrawType = 'pick3' | 'pick4'
export type QuickMoneyDeliveryStatus = 'received' | 'pending' | 'late' | 'missing'
export type QuickMoneyValidationStatus = 'ready' | 'pending' | 'failed' | 'notApplicable'
export type QuickMoneyContingencyStatus = 'ready' | 'notApplicable'

export interface QuickMoneyDrawVideo {
  id: string
  drawType: QuickMoneyDrawType
  drawNumber: string
  scheduledTime: string
  filename: string | null
  deliveryStatus: QuickMoneyDeliveryStatus
  validationStatus: QuickMoneyValidationStatus
  receivedAt: string | null
  deadline: string
  contingencyStatus: QuickMoneyContingencyStatus
  fileSizeMb: number | null
  durationSeconds: number | null
  resolution: string | null
  codec: string | null
  checksum: string | null
  validationLog: VideoValidationLogEntry[]
}

export interface QuickMoneyVideoSummary {
  expectedToday: number
  expectedPick3: number
  expectedPick4: number
  received: number
  pendingValidation: number
  lateOrMissing: number
  storageUsedGb: number
  storageTotalGb: number
}

// ---------------------------------------------------------------------------------------------
// Upload History -- log de auditoría, solo lectura (ver criterios: nunca Replace/Delete/Modify
// desde acá). `relatedGame`+`relatedId` apuntan de vuelta al asset de Roulette o al draw de Quick
// Money que originó la fila (ver VideoManagementPage.tsx: "Open Related Video").
export type UploadHistoryGame = 'roulette' | 'quickMoney'
export type UploadHistoryStatus = 'success' | 'failed' | 'pending'
export type UploadHistoryValidation = 'passed' | 'failed' | 'pending' | 'notApplicable'

export interface UploadHistoryRecord {
  id: string
  uploadedAt: string
  game: UploadHistoryGame
  relatedLabel: string
  relatedId: string
  filename: string
  uploadedBy: string
  status: UploadHistoryStatus
  validation: UploadHistoryValidation
  fileSizeMb: number
  checksum: string | null
  isReplacement: boolean
  validationLog: VideoValidationLogEntry[]
}
