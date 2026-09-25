import { create } from 'zustand'
import {
  QUICK_MONEY_VIDEO_ROWS,
  ROULETTE_VIDEO_ASSETS,
  UPLOAD_HISTORY_RECORDS,
} from '../data/adminVideosMockData'
import type { QuickMoneyDrawVideo, RouletteVideoAsset, UploadHistoryRecord } from '../types/adminVideos'

// Store compartido por los 3 tabs de Admin > Videos -- necesario (en vez de useState local por
// tab, como GameEvents/Users) porque subir/reemplazar un video en Roulette o Quick Money también
// debe aparecer en Upload History (pedido explícito: "representa el historial de las MISMAS
// operaciones de video"), y porque las 3 pestañas siguen montadas/desmontadas juntas al cambiar de
// tab -- sin un store, cada re-montado perdería los cambios hechos en la sesión.
interface AdminVideosStore {
  rouletteAssets: RouletteVideoAsset[]
  quickMoneyRows: QuickMoneyDrawVideo[]
  uploadHistory: UploadHistoryRecord[]

  // Re-scan Library (Roulette) -- resuelve los assets 'pendingScan' a 'available'/'passed', igual
  // que terminar un escaneo real encontraría el archivo ya presente y lo validaría.
  rescanRouletteLibrary: () => void
  // Refresh Status (Quick Money) -- resuelve validación 'pending' de draws ya recibidos a 'ready'.
  refreshQuickMoneyStatus: () => void

  // Upload/Replace -- toma el File elegido en UploadVideoModal.tsx y actualiza el asset/draw
  // correspondiente + agrega su entrada en Upload History. Sin backend real (ver investigación
  // previa: cero endpoint de upload en todo el proyecto), así que la "subida" es una actualización
  // de metadata local a partir de File.name/File.size -- mock interactivo, no un no-op.
  uploadRouletteVideo: (assetId: string, file: File, uploadedBy: string) => void
  uploadQuickMoneyVideo: (rowId: string, file: File, uploadedBy: string) => void
}

function fileSizeMb(file: File): number {
  return Math.round((file.size / (1024 * 1024)) * 10) / 10
}

function nowIso(): string {
  return new Date().toISOString()
}

// Mismo formato que los checksums generados en adminVideosMockData.ts -- acá no hay un hash real
// del contenido del archivo (el navegador no expone eso sin leer todo el File), así que se deriva
// del nombre+tamaño+momento de subida, suficiente para que cada subida tenga un valor distinto.
function mockChecksum(file: File, timestamp: string): string {
  let hash = 0
  const input = `${file.name}:${file.size}:${timestamp}`
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  return `sha256:${hash.toString(16).padStart(16, '0')}`
}

export const useAdminVideosStore = create<AdminVideosStore>((set, get) => ({
  rouletteAssets: ROULETTE_VIDEO_ASSETS,
  quickMoneyRows: QUICK_MONEY_VIDEO_ROWS,
  uploadHistory: UPLOAD_HISTORY_RECORDS,

  rescanRouletteLibrary: () =>
    set((state) => ({
      rouletteAssets: state.rouletteAssets.map((asset) =>
        asset.status === 'pendingScan'
          ? {
              ...asset,
              status: 'available',
              validation: 'passed',
              lastVerifiedAt: nowIso(),
              validationLog: [...asset.validationLog, { id: `${asset.id}-log-${Date.now()}`, timestamp: nowIso(), message: 'Re-scan completed: asset verified.' }],
            }
          : asset,
      ),
    })),

  refreshQuickMoneyStatus: () =>
    set((state) => ({
      quickMoneyRows: state.quickMoneyRows.map((row) =>
        row.deliveryStatus === 'received' && row.validationStatus === 'pending'
          ? {
              ...row,
              validationStatus: 'ready',
              validationLog: [...row.validationLog, { id: `${row.id}-log-${Date.now()}`, timestamp: nowIso(), message: 'Status refreshed: validation ready.' }],
            }
          : row,
      ),
    })),

  uploadRouletteVideo: (assetId, file, uploadedBy) => {
    const asset = get().rouletteAssets.find((a) => a.id === assetId)
    if (!asset) return
    const isReplacement = asset.status !== 'missing'
    const timestamp = nowIso()
    const checksum = mockChecksum(file, timestamp)

    set((state) => ({
      rouletteAssets: state.rouletteAssets.map((a) =>
        a.id === assetId
          ? {
              ...a,
              filename: file.name,
              status: 'available' as const,
              validation: 'passed' as const,
              fileSizeMb: fileSizeMb(file),
              durationSeconds: a.durationSeconds ?? 16,
              resolution: a.resolution ?? '1920x1080',
              codec: a.codec ?? 'H.264',
              lastVerifiedAt: timestamp,
              checksum,
              validationLog: [...a.validationLog, { id: `${a.id}-log-${Date.now()}`, timestamp, message: isReplacement ? 'File replaced and validated.' : 'File uploaded and validated.' }],
            }
          : a,
      ),
      uploadHistory: [
        {
          id: `upload-${assetId}-${Date.now()}`,
          uploadedAt: timestamp,
          game: 'roulette' as const,
          relatedLabel: `Roulette #${asset.resultNumber} · Variant ${asset.variant}`,
          relatedId: assetId,
          filename: file.name,
          uploadedBy,
          status: 'success' as const,
          validation: 'passed' as const,
          fileSizeMb: fileSizeMb(file),
          checksum,
          isReplacement,
          validationLog: [{ id: `upload-${assetId}-log-${Date.now()}`, timestamp, message: isReplacement ? 'File replaced and validated.' : 'File uploaded and validated.' }],
        },
        ...state.uploadHistory,
      ],
    }))
  },

  uploadQuickMoneyVideo: (rowId, file, uploadedBy) => {
    const row = get().quickMoneyRows.find((r) => r.id === rowId)
    if (!row) return
    const isReplacement = row.deliveryStatus === 'received'
    const timestamp = nowIso()
    const checksum = mockChecksum(file, timestamp)

    set((state) => ({
      quickMoneyRows: state.quickMoneyRows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              filename: file.name,
              deliveryStatus: 'received' as const,
              validationStatus: 'ready' as const,
              receivedAt: timestamp,
              fileSizeMb: fileSizeMb(file),
              durationSeconds: r.durationSeconds ?? 16,
              resolution: r.resolution ?? '1920x1080 (16:9)',
              codec: r.codec ?? 'H.264 / AAC / MP4',
              checksum,
              validationLog: [...r.validationLog, { id: `${r.id}-log-${Date.now()}`, timestamp, message: isReplacement ? 'File replaced and validated.' : 'File received and validated.' }],
            }
          : r,
      ),
      uploadHistory: [
        {
          id: `upload-${rowId}-${Date.now()}`,
          uploadedAt: timestamp,
          game: 'quickMoney' as const,
          relatedLabel: `${row.drawType === 'pick3' ? 'Pick 3' : 'Pick 4'} · Draw #${row.drawNumber}`,
          relatedId: rowId,
          filename: file.name,
          uploadedBy,
          status: 'success' as const,
          validation: 'passed' as const,
          fileSizeMb: fileSizeMb(file),
          checksum,
          isReplacement,
          validationLog: [{ id: `upload-${rowId}-log-${Date.now()}`, timestamp, message: isReplacement ? 'File replaced and validated.' : 'File received and validated.' }],
        },
        ...state.uploadHistory,
      ],
    }))
  },
}))
