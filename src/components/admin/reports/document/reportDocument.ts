import { formatCompactCurrency, formatCount, formatCurrency, formatDate, formatDateTime, formatPercent, formatPoints } from '../../../../utils/reportFormat'

// Modelo neutro de un reporte, sin React: los exportadores (CSV, Excel, PDF) leen este mismo
// documento, así los tres archivos traen las mismas secciones, columnas y cifras.
//
// Los valores se guardan sin formato junto con su tipo (`ValueFormat`): el PDF los formatea
// ("RD$ 1,234.50"), el Excel los escribe como número con formato de celda y el CSV como número
// plano.

export type ValueFormat = 'text' | 'currency' | 'count' | 'percent' | 'percent0' | 'percent1' | 'points' | 'date' | 'dateTime'
// Formatos extra de gráficas (ejes y tooltips).
export type ChartFormat = ValueFormat | 'compactCurrency' | 'roundCount' | 'percentAxis' | 'pointsAxis'

export type CellValue = string | number | Date | null

export interface DocCell {
  value: CellValue
  format?: ValueFormat
  // Comparación (Semanal/Mensual): valor del período anterior y variación ya formateada.
  previous?: CellValue
  change?: string
  strong?: boolean
  tag?: 'plain' | 'manual' | 'warning'
}

export type CellInput = CellValue | DocCell

export interface DocColumn {
  key: string
  header: string
  format: ValueFormat
  align: 'left' | 'right'
}

export interface DocRow {
  key: string
  cells: Record<string, CellInput>
  kind?: 'subtotal'
  tone?: 'warning'
  // Filas hijas (banca -> máquinas): en pantalla se despliegan, en los archivos van todas.
  children?: DocRow[]
}

export interface DocTable {
  type: 'table'
  // Subtítulo dentro del panel (ej. "Semana 2 · 07/09 – 13/09").
  title?: string
  columns: DocColumn[]
  rows: DocRow[]
  footer?: DocRow[]
  // Solo pantalla: en los archivos van todas las filas.
  pageSize?: number
  emptyText?: string
  fixedLayout?: boolean
  hideHeader?: boolean
  // Solo pantalla (vista resumida): ej. "Se muestran 10 de 1,440...".
  note?: string
}

export interface DocBarChart {
  type: 'barChart'
  categoryLabel: string
  categories: string[]
  tooltipTitles?: string[]
  series: { key: string; label: string; color: string; values: number[] }[]
  reference?: { value: number; label: string }
  valueFormat: ChartFormat
  axisFormat?: ChartFormat
  height?: number
}

export interface DocLineChart {
  type: 'lineChart'
  categoryLabel: string
  categories: string[]
  series: { key: string; label: string; color: string; values: (number | null)[]; dashed?: boolean }[]
  band?: { min: number; max: number; label: string }
  markers?: { index: number; label: string }[]
  markerLegend?: string
  valueFormat: ChartFormat
  axisFormat?: ChartFormat
  height?: number
}

export type DocChart = DocBarChart | DocLineChart
export type DocPanelContent = DocTable | DocChart

export interface DocPanel {
  type: 'panel'
  key: string
  title: string
  subtitle?: string
  content: DocPanelContent[]
}

export interface DocStat {
  key: string
  label: string
  value: CellValue
  format: ValueFormat
  previous?: CellValue
  change?: string
  tone?: 'warning'
}

export type DocBlock =
  | { type: 'note'; text: string }
  | { type: 'alert'; text: string }
  | { type: 'stats'; stats: DocStat[] }
  | DocPanel
  // Dos paneles lado a lado en pantalla; en el PDF van uno debajo del otro.
  | { type: 'row'; panels: DocPanel[] }
  // Comienzo de una sección (archivos de "Todos los juegos": combinado + una sección por juego).
  // Abarca los bloques que siguen hasta la próxima sección. `short` = prefijo de las hojas de Excel.
  | DocSection

export interface DocSection {
  type: 'section'
  key: string
  title: string
  short: string
}

// Textos fijos de los archivos (vienen traducidos, así los exportadores no dependen de i18n).
export interface DocLabels {
  indicators: string
  indicator: string
  value: string
  previous: string
  change: string
  summarySheet: string
  page: string
  of: string
}

export interface ReportDocument {
  title: string
  // Moneda de los montos (código ISO 4217): el worker que arma Excel/PDF la aplica antes de formatear.
  currency: string
  meta: { label: string; value: string }[]
  // "Semana anterior" / "Mes anterior" / "Período anterior" -- solo si hay comparación.
  previousLabel?: string
  labels: DocLabels
  blocks: DocBlock[]
}

export const NUMERIC_FORMATS: ReadonlySet<ValueFormat> = new Set(['currency', 'count', 'percent', 'percent0', 'percent1', 'points'])

export function column(key: string, header: string, format: ValueFormat, align?: 'left' | 'right'): DocColumn {
  return { key, header, format, align: align ?? (NUMERIC_FORMATS.has(format) ? 'right' : 'left') }
}

export const isDocCell = (input: CellInput | undefined): input is DocCell => input !== null && typeof input === 'object' && !(input instanceof Date)

export function cellOf(input: CellInput | undefined): DocCell {
  if (input === undefined) return { value: '' }
  return isDocCell(input) ? input : { value: input }
}

// Texto tal como se ve en pantalla. null -> "—"; '' queda vacío.
export function formatValue(value: CellValue, format: ValueFormat): string {
  if (value === null) return '—'
  if (value instanceof Date) return format === 'date' ? formatDate(value) : formatDateTime(value)
  if (typeof value === 'string') return value
  switch (format) {
    case 'currency':
      return formatCurrency(value)
    case 'count':
      return formatCount(value)
    case 'percent':
      return formatPercent(value)
    case 'percent0':
      return formatPercent(value, 0)
    case 'percent1':
      return formatPercent(value, 1)
    case 'points':
      return formatPoints(value)
    default:
      return String(value)
  }
}

export function formatChartValue(value: number, format: ChartFormat): string {
  switch (format) {
    case 'compactCurrency':
      return formatCompactCurrency(value)
    case 'roundCount':
      return formatCount(Math.round(value))
    case 'percentAxis':
      return formatPercent(value, Number.isInteger(value) ? 0 : 1)
    case 'pointsAxis':
      return value === 0 ? '0' : formatPoints(value).replace(' pp', '')
    default:
      return formatValue(value, format)
  }
}

// Todos los paneles del documento, en orden (incluye los que van lado a lado).
export function documentPanels(doc: ReportDocument): DocPanel[] {
  return doc.blocks.flatMap((block) => (block.type === 'panel' ? [block] : block.type === 'row' ? block.panels : []))
}
