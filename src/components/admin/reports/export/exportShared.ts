import { reportCurrencySymbol } from '../../../../utils/reportFormat'
import { cellOf, isDocCell, type DocTable, type ValueFormat } from '../document/reportDocument'

// Columnas con comparación (alguna celda trae `previous`): en los archivos se abren en tres
// columnas -- valor, anterior y variación -- en vez de las dos líneas de la pantalla.
export function compareColumnKeys(table: DocTable): Set<string> {
  const keys = new Set<string>()
  const rows = [...table.rows, ...table.rows.flatMap((r) => r.children ?? []), ...(table.footer ?? [])]
  for (const row of rows) {
    for (const [key, input] of Object.entries(row.cells)) {
      if (isDocCell(input) && cellOf(input).previous !== undefined) keys.add(key)
    }
  }
  return keys
}

export interface ChartImage {
  // JPEG (ver paintChart.ts).
  dataUrl: string
  width: number
  height: number
}

// Gráficas ya dibujadas (paintChart.ts, en la página), por `chartKey(panel, índice del contenido)`:
// Excel y PDF corren en un worker, sin canvas ni fuentes de la página.
export type ChartImages = Record<string, ChartImage>

export const chartKey = (panelKey: string, index: number) => `${panelKey}/${index}`

// Unidad en el encabezado cuando el valor va sin formato (CSV).
export function unitHeader(header: string, format: ValueFormat): string {
  if (format === 'currency') return `${header} (${reportCurrencySymbol()})`
  if (format === 'percent' || format === 'percent0' || format === 'percent1') return `${header} (%)`
  if (format === 'points') return `${header} (pp)`
  return header
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Algunos navegadores leen el blob después del click: se libera en el siguiente ciclo.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
