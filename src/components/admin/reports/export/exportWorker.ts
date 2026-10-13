import { setReportCurrency } from '../../../../utils/reportFormat'
import type { ReportDocument } from '../document/reportDocument'
import type { ChartImages } from './exportShared'

// Arma el Excel/PDF fuera de la página: con muchas filas (ej. todas las rondas de un mes) tarda
// varios segundos y, en el hilo principal, congelaría el Admin mientras tanto. Queda vivo entre
// exportaciones (librerías y fuente cargadas una sola vez); cada pedido lleva su `id`. Cada formato
// carga solo su librería: un PDF no baja exceljs (~4 MB sin minificar en desarrollo).

export interface ExportRequest {
  id: number
  format: 'excel' | 'pdf'
  doc: ReportDocument
  charts: ChartImages
}

export type ExportResponse = { id: number } & ({ ok: true; blob: Blob } | { ok: false; error: string })

const scope = self as unknown as { onmessage: ((event: MessageEvent<ExportRequest>) => void) | null; postMessage: (message: ExportResponse) => void }

scope.onmessage = async ({ data }) => {
  try {
    // Este módulo tiene su propia copia del formateo: la moneda llega con el documento.
    setReportCurrency(data.doc.currency)
    const blob =
      data.format === 'excel'
        ? await (await import('./exportExcel')).buildExcel(data.doc, data.charts)
        : await (await import('./exportPdf')).buildPdf(data.doc, data.charts)
    scope.postMessage({ id: data.id, ok: true, blob })
  } catch (error) {
    scope.postMessage({ id: data.id, ok: false, error: error instanceof Error ? (error.stack ?? error.message) : String(error) })
  }
}
