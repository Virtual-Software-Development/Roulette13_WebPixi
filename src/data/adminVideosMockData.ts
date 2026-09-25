import type { StatusBadgeVariant } from '../types/rtpDashboard'
import type {
  QuickMoneyContingencyStatus,
  QuickMoneyDeliveryStatus,
  QuickMoneyDrawVideo,
  QuickMoneyValidationStatus,
  QuickMoneyVideoSummary,
  RouletteVideoAsset,
  RouletteVideoStatus,
  RouletteVideoSummary,
  RouletteVideoValidation,
  UploadHistoryGame,
  UploadHistoryRecord,
  UploadHistoryStatus,
  UploadHistoryValidation,
  VideoValidationLogEntry,
} from '../types/adminVideos'

// Mock TEMPORAL para Admin > Videos -- no existe todavía ningún endpoint/store de assets de video
// (ver investigación previa: cero precedente de "checksum"/"validation"/"codec"/"re-scan" en todo
// el proyecto). Mismo criterio que adminGameEventsMockData.ts: todos los componentes reciben estos
// datos por props, reemplazar este archivo por fetch real no requiere tocar ningún componente.

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS

function isoMinutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * MINUTE_MS).toISOString()
}

function isoHoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * HOUR_MS).toISOString()
}

function logEntry(id: string, minutesAgo: number, message: string): VideoValidationLogEntry {
  return { id, timestamp: isoMinutesFromNow(-minutesAgo), message }
}

// -------------------------------------------------------------------------------------------
// ROULETTE VIDEO LIBRARY -- un asset esperado por cada combinación número x variante (0, 00,
// 1-36 x variantes A-E = 190 assets esperados). Solo Videos/12/12_0.webm existe realmente en
// local-media hoy (ver utils/media.ts) -- el resultNumber '12' variante 'A' es el único asset con
// un archivo REAL reproducible; el resto de los "Available" tienen metadata realista pero ningún
// archivo real detrás (ver RouletteVideoLibraryTab.tsx: el Preview reutiliza ese único archivo
// real para cualquier fila Available, con un aviso, en vez de un <video> roto).
const RESULT_NUMBERS = ['0', '00', ...Array.from({ length: 36 }, (_, i) => String(i + 1))]
const VARIANTS = ['A', 'B', 'C', 'D', 'E']

// Índices (dentro del array plano número x variante, en orden de generación) forzados a un status
// distinto de 'available' -- fijos y pocos, para poblar cada estado especial sin dejar la tabla
// mayormente rota (mismo espíritu que el mockup de referencia: una library mayormente sana).
const MISSING_INDEXES = new Set([7, 46, 121, 171])
const INVALID_INDEXES = new Set([31, 89])
const PENDING_SCAN_INDEXES = new Set([176])

function rouletteValidationFor(status: RouletteVideoStatus): RouletteVideoValidation {
  if (status === 'missing') return 'notApplicable'
  if (status === 'invalid') return 'failed'
  if (status === 'pendingScan') return 'pending'
  return 'passed'
}

function buildRouletteAssets(): RouletteVideoAsset[] {
  const assets: RouletteVideoAsset[] = []
  let index = 0
  for (const resultNumber of RESULT_NUMBERS) {
    for (const variant of VARIANTS) {
      const status: RouletteVideoStatus = MISSING_INDEXES.has(index)
        ? 'missing'
        : INVALID_INDEXES.has(index)
          ? 'invalid'
          : PENDING_SCAN_INDEXES.has(index)
            ? 'pendingScan'
            : 'available'
      const id = `roulette-${resultNumber}-${variant}`
      const hasFile = status !== 'missing'
      // Tamaño/duración con variación leve determinística (no Math.random -- mismo dataset en
      // cada carga, necesario para que los tests de filtro/paginación sean reproducibles).
      const fileSizeMb = hasFile ? 88 + ((index * 7) % 62) : null
      assets.push({
        id,
        resultNumber,
        variant,
        filename: hasFile ? `roulette_${resultNumber}_var${variant}.mp4` : null,
        status,
        validation: rouletteValidationFor(status),
        fileSizeMb,
        durationSeconds: hasFile ? 16 : null,
        resolution: hasFile ? '1920x1080' : null,
        codec: hasFile ? 'H.264' : null,
        lastVerifiedAt: isoMinutesFromNow(-((index % 30) * 7 + 3)),
        checksum: hasFile ? `sha256:${(index * 2654435761).toString(16).padStart(16, '0').slice(0, 16)}` : null,
        validationLog:
          status === 'invalid'
            ? [
                logEntry(`${id}-log-1`, 12, 'Automated re-scan started.'),
                logEntry(`${id}-log-2`, 11, 'Checksum mismatch detected against manifest.'),
                logEntry(`${id}-log-3`, 11, 'Validation failed: file marked as Invalid.'),
              ]
            : status === 'pendingScan'
              ? [logEntry(`${id}-log-1`, 4, 'Queued for validation after last library scan.')]
              : [logEntry(`${id}-log-1`, ((index % 30) * 7 + 3), 'Validation passed on last library scan.')],
      })
      index += 1
    }
  }
  return assets
}

export const ROULETTE_VIDEO_ASSETS: RouletteVideoAsset[] = buildRouletteAssets()

export const ROULETTE_VIDEO_SUMMARY: RouletteVideoSummary = (() => {
  const expectedAssets = ROULETTE_VIDEO_ASSETS.length
  const missing = ROULETTE_VIDEO_ASSETS.filter((a) => a.status === 'missing').length
  const invalid = ROULETTE_VIDEO_ASSETS.filter((a) => a.status === 'invalid').length
  // "Available" incluye pendingScan (el archivo SÍ existe, solo falta re-verificarlo) -- ver
  // comentario de MISSING/INVALID/PENDING_SCAN_INDEXES arriba.
  const available = expectedAssets - missing - invalid
  const storageUsedGb = ROULETTE_VIDEO_ASSETS.reduce((sum, a) => sum + (a.fileSizeMb ?? 0), 0) / 1024
  return { expectedAssets, available, missing, invalid, storageUsedGb: Math.round(storageUsedGb * 10) / 10, storageTotalGb: 250 }
})()

export const ROULETTE_STATUS_VARIANT: Record<RouletteVideoStatus, StatusBadgeVariant> = {
  available: 'positive',
  missing: 'danger',
  invalid: 'danger',
  pendingScan: 'warning',
}

export const ROULETTE_VALIDATION_VARIANT: Record<RouletteVideoValidation, StatusBadgeVariant> = {
  passed: 'positive',
  failed: 'danger',
  pending: 'warning',
  notApplicable: 'neutral',
}

// -------------------------------------------------------------------------------------------
// QUICK MONEY VIDEO STATUS -- un row por draw programado de HOY (Pick 3 y Pick 4, cadencia
// horaria, 14 de cada uno). scheduledTime relativo a "ahora" (mismo criterio que
// quickMoneyLobbyMockData.ts: nunca fechas fijas, así el dataset sigue teniendo sentido sin
// importar cuándo se cargue la página) -- los slots ya pasados quedan Received/Ready por
// default, los futuros Pending, con overrides puntuales para cubrir Late/Missing/Failed.
const QUICK_MONEY_SLOT_HOURS = Array.from({ length: 14 }, (_, i) => i - 7) // -7h .. +6h desde ahora
const QUICK_MONEY_DRAW_BASE = { pick3: 356700, pick4: 58100 }

// Overrides por índice de slot (0-13) -- pocos y deliberados, para demostrar cada estado especial
// sin dejar la mayoría de la tabla en un estado no-saludable.
const LATE_SLOT_INDEXES = new Set([4])
const MISSING_SLOT_INDEXES = new Set([2, 12])
const FAILED_VALIDATION_SLOT_INDEXES = new Set([5])

function buildQuickMoneyDraws(drawType: 'pick3' | 'pick4'): QuickMoneyDrawVideo[] {
  return QUICK_MONEY_SLOT_HOURS.map((hourOffset, slotIndex) => {
    const scheduledTime = isoHoursFromNow(hourOffset)
    const deadline = isoMinutesFromNow(hourOffset * 60 + 10)
    const isPast = hourOffset <= 0
    const drawNumber = String(QUICK_MONEY_DRAW_BASE[drawType] + slotIndex)
    const id = `${drawType}-${drawNumber}`

    let deliveryStatus: QuickMoneyDeliveryStatus
    let validationStatus: QuickMoneyValidationStatus
    let contingencyStatus: QuickMoneyContingencyStatus = 'notApplicable'
    let receivedAt: string | null = null

    if (MISSING_SLOT_INDEXES.has(slotIndex) && isPast) {
      deliveryStatus = 'missing'
      validationStatus = 'notApplicable'
      contingencyStatus = 'ready'
    } else if (LATE_SLOT_INDEXES.has(slotIndex) && isPast) {
      deliveryStatus = 'late'
      validationStatus = 'notApplicable'
      contingencyStatus = 'ready'
    } else if (!isPast) {
      // Slots futuros: la mayoría llegan con margen (contingencia lista); un par ya recibidos
      // con anticipación, el resto Pending.
      deliveryStatus = slotIndex % 3 === 0 ? 'received' : 'pending'
      validationStatus = deliveryStatus === 'received' ? 'ready' : 'notApplicable'
      contingencyStatus = 'ready'
      receivedAt = deliveryStatus === 'received' ? isoMinutesFromNow(hourOffset * 60 - 58) : null
    } else {
      deliveryStatus = 'received'
      receivedAt = isoMinutesFromNow(hourOffset * 60 + 2)
      validationStatus = FAILED_VALIDATION_SLOT_INDEXES.has(slotIndex) ? 'failed' : 'ready'
    }

    const hasFile = deliveryStatus === 'received'
    const fileSizeMb = hasFile ? 78 + ((slotIndex * 11) % 40) : null

    return {
      id,
      drawType,
      drawNumber,
      scheduledTime,
      filename: hasFile ? `${drawType === 'pick3' ? 'P3' : 'P4'}_${drawNumber}_${scheduledTime.slice(11, 13)}00.mp4` : null,
      deliveryStatus,
      validationStatus,
      receivedAt,
      deadline,
      contingencyStatus,
      fileSizeMb,
      durationSeconds: hasFile ? 16 : null,
      resolution: hasFile ? '1920x1080 (16:9)' : null,
      codec: hasFile ? 'H.264 / AAC / MP4' : null,
      checksum: hasFile ? `sha256:${(slotIndex * 40503 + hourOffset * 977).toString(16).padStart(16, '0').slice(0, 16)}` : null,
      validationLog:
        validationStatus === 'failed'
          ? [
              logEntry(`${id}-log-1`, 8, 'Delivery received, automated validation started.'),
              logEntry(`${id}-log-2`, 7, 'Duration mismatch: expected 00:16, found 00:09.'),
              logEntry(`${id}-log-3`, 7, 'Validation failed.'),
            ]
          : hasFile
            ? [logEntry(`${id}-log-1`, 6, 'Delivery received and validated successfully.')]
            : [],
    }
  })
}

export const QUICK_MONEY_VIDEO_ROWS: QuickMoneyDrawVideo[] = [...buildQuickMoneyDraws('pick3'), ...buildQuickMoneyDraws('pick4')].sort(
  (a, b) => a.scheduledTime.localeCompare(b.scheduledTime),
)

export const QUICK_MONEY_VIDEO_SUMMARY: QuickMoneyVideoSummary = (() => {
  const expectedPick3 = QUICK_MONEY_VIDEO_ROWS.filter((r) => r.drawType === 'pick3').length
  const expectedPick4 = QUICK_MONEY_VIDEO_ROWS.filter((r) => r.drawType === 'pick4').length
  const received = QUICK_MONEY_VIDEO_ROWS.filter((r) => r.deliveryStatus === 'received').length
  const pendingValidation = QUICK_MONEY_VIDEO_ROWS.filter((r) => r.validationStatus === 'pending' || r.deliveryStatus === 'pending').length
  const lateOrMissing = QUICK_MONEY_VIDEO_ROWS.filter((r) => r.deliveryStatus === 'late' || r.deliveryStatus === 'missing').length
  const storageUsedGb = QUICK_MONEY_VIDEO_ROWS.reduce((sum, r) => sum + (r.fileSizeMb ?? 0), 0) / 1024
  return {
    expectedToday: expectedPick3 + expectedPick4,
    expectedPick3,
    expectedPick4,
    received,
    pendingValidation,
    lateOrMissing,
    storageUsedGb: Math.round(storageUsedGb * 10) / 10,
    storageTotalGb: 250,
  }
})()

export const QUICK_MONEY_DELIVERY_VARIANT: Record<QuickMoneyDeliveryStatus, StatusBadgeVariant> = {
  received: 'positive',
  pending: 'warning',
  late: 'danger',
  missing: 'danger',
}

export const QUICK_MONEY_VALIDATION_VARIANT: Record<QuickMoneyValidationStatus, StatusBadgeVariant> = {
  ready: 'positive',
  pending: 'warning',
  failed: 'danger',
  notApplicable: 'neutral',
}

export const QUICK_MONEY_CONTINGENCY_VARIANT: Record<QuickMoneyContingencyStatus, StatusBadgeVariant> = {
  ready: 'info',
  notApplicable: 'neutral',
}

// -------------------------------------------------------------------------------------------
// UPLOAD HISTORY -- log de auditoría de operaciones de video ya ocurridas (subidas/reemplazos),
// generado a partir de una muestra de los assets/draws de arriba. Puramente de lectura (ver
// UploadHistoryTab.tsx: sin Replace/Delete/Modify).
const UPLOADERS = ['J. Martinez', 'A. Chen', 'System (auto-scan)', 'R. Alvarez']

function buildUploadHistory(): UploadHistoryRecord[] {
  const records: UploadHistoryRecord[] = []

  ROULETTE_VIDEO_ASSETS.filter((a) => a.filename).forEach((asset, i) => {
    if (i % 17 !== 0) return
    const game: UploadHistoryGame = 'roulette'
    const status: UploadHistoryStatus = asset.status === 'invalid' ? 'failed' : 'success'
    records.push({
      id: `upload-roulette-${asset.id}`,
      uploadedAt: isoMinutesFromNow(-(i * 13 + 40)),
      game,
      relatedLabel: `Roulette #${asset.resultNumber} · Variant ${asset.variant}`,
      relatedId: asset.id,
      filename: asset.filename!,
      uploadedBy: UPLOADERS[i % UPLOADERS.length],
      status,
      validation: status === 'failed' ? 'failed' : 'passed',
      fileSizeMb: asset.fileSizeMb ?? 0,
      checksum: asset.checksum,
      isReplacement: i % 34 === 17,
      validationLog: asset.validationLog,
    })
  })

  QUICK_MONEY_VIDEO_ROWS.filter((r) => r.filename).forEach((row, i) => {
    const game: UploadHistoryGame = 'quickMoney'
    const status: UploadHistoryStatus = row.validationStatus === 'failed' ? 'failed' : 'success'
    records.push({
      id: `upload-quickmoney-${row.id}`,
      uploadedAt: row.receivedAt ?? isoMinutesFromNow(-(i * 9 + 20)),
      game,
      relatedLabel: `${row.drawType === 'pick3' ? 'Pick 3' : 'Pick 4'} · Draw #${row.drawNumber}`,
      relatedId: row.id,
      filename: row.filename!,
      uploadedBy: UPLOADERS[(i + 1) % UPLOADERS.length],
      status,
      validation: status === 'failed' ? 'failed' : 'passed',
      fileSizeMb: row.fileSizeMb ?? 0,
      checksum: row.checksum,
      isReplacement: false,
      validationLog: row.validationLog,
    })
  })

  return records.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
}

export const UPLOAD_HISTORY_RECORDS: UploadHistoryRecord[] = buildUploadHistory()

export const UPLOAD_HISTORY_STATUS_VARIANT: Record<UploadHistoryStatus, StatusBadgeVariant> = {
  success: 'positive',
  failed: 'danger',
  pending: 'warning',
}

export const UPLOAD_HISTORY_VALIDATION_VARIANT: Record<UploadHistoryValidation, StatusBadgeVariant> = {
  passed: 'positive',
  failed: 'danger',
  pending: 'warning',
  notApplicable: 'neutral',
}
