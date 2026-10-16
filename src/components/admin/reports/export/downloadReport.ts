import type { TFunction } from 'i18next'
import { fetchReportData, logReportDownload } from '../../../../api/adminReports'
import type { RecentReportFormat, RecentReportRow } from '../../../../types/adminReports'
import { reportNow } from '../../../../utils/reportFormat'
import { customPeriod, fromIsoDate } from '../../../../utils/reportPeriod'
import { buildReportDocument, periodKindOf } from '../document/buildReportDocument'
import type { ReportDocument } from '../document/reportDocument'
import { buildCsv } from './exportCsv'
import { saveBlob } from './exportShared'
import type { ExportRequest, ExportResponse } from './exportWorker'
import { renderDocumentCharts } from './paintChart'

const EXTENSION: Record<RecentReportFormat, string> = { csv: 'csv', pdf: 'pdf', excel: 'xlsx' }

// Excel y PDF se arman en un worker (exportWorker.ts): sus librerías (exceljs, jsPDF) se cargan
// recién ahí, así no pesan en el resto del Admin, y la página no se congela mientras se genera.
// Un solo worker para todas las exportaciones: crear uno por archivo volvía a cargar ~1.4 MB de
// librerías cada vez (~1 s en hardware lento). Si se rompe, se crea otro en el próximo pedido.
let worker: Worker | null = null
let nextRequestId = 0
const pending = new Map<number, { resolve: (blob: Blob) => void; reject: (error: Error) => void }>()

function exportWorker(): Worker {
  if (worker) return worker
  const created = new Worker(new URL('./exportWorker.ts', import.meta.url), { type: 'module' })
  created.onmessage = ({ data }: MessageEvent<ExportResponse>) => {
    const request = pending.get(data.id)
    if (!request) return
    pending.delete(data.id)
    if (data.ok) request.resolve(data.blob)
    else request.reject(new Error(data.error))
  }
  created.onerror = (event) => {
    pending.forEach((request) => request.reject(new Error(event.message || 'Export worker failed')))
    pending.clear()
    created.terminate()
    worker = null
  }
  worker = created
  return created
}

// Las gráficas se dibujan antes acá, porque necesitan canvas y la fuente de la página.
async function buildInWorker(doc: ReportDocument, format: 'excel' | 'pdf'): Promise<Blob> {
  const request: ExportRequest = { id: nextRequestId++, format, doc, charts: await renderDocumentCharts(doc) }
  return new Promise<Blob>((resolve, reject) => {
    pending.set(request.id, { resolve, reject })
    exportWorker().postMessage(request)
  })
}

// Genera y descarga el archivo del documento.
export async function downloadReportDocument(doc: ReportDocument, format: RecentReportFormat, fileBaseName: string) {
  const blob = format === 'csv' ? buildCsv(doc) : await buildInWorker(doc, format)
  saveBlob(blob, `${fileBaseName.replace(/[\\/:*?"<>|\s]+/g, '-')}.${EXTENSION[format]}`)
}

// Reportes Recientes: el archivo no se guarda en el backend, así que se vuelven a pedir los datos
// con el tipo, período y juego de la fila y se arma el documento (cifras al momento de descargar).
export async function downloadRecentReport(report: RecentReportRow, format: RecentReportFormat, t: TFunction, language: string) {
  const now = reportNow()
  const start = fromIsoDate(report.period.start) ?? now
  const end = fromIsoDate(report.period.end) ?? now
  const request = { type: report.type, period: customPeriod(start, end, now), kind: periodKindOf(report.type), game: report.game, byGame: true }
  const data = await fetchReportData(request)
  const doc = buildReportDocument({ ...request, now, generatedBy: report.generatedBy, generatedAt: report.createdAt, data }, t, language)
  await downloadReportDocument(doc, format, report.name)
  // El archivo ya se descargó: si el registro falla no se le muestra error al usuario.
  void logReportDownload(report, format).catch((err) => console.warn('[reports] could not log the download:', err))
}
