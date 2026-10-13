import ExcelJS from 'exceljs'
import { cellOf, formatValue, type CellValue, type DocChart, type DocPanel, type DocRow, type DocSection, type DocTable, type ReportDocument, type ValueFormat } from '../document/reportDocument'
import { reportCurrencyDigits, reportCurrencySymbol } from '../../../../utils/reportFormat'
import { chartKey, compareColumnKeys, type ChartImage, type ChartImages } from './exportShared'

// Excel: una hoja "Resumen" (encabezado del reporte, notas e indicadores) y una hoja por panel,
// con el mismo título y las mismas columnas que en pantalla. Las celdas son números y fechas reales
// con formato (moneda, %, pp, dd/mm/aaaa), así se pueden sumar y filtrar. Las máquinas quedan
// agrupadas debajo de su banca (se pueden contraer como en pantalla) y las gráficas van como imagen
// con su tabla de datos debajo.

const NUM_FMT: Partial<Record<ValueFormat, string>> = {
  count: '#,##0',
  percent: '0.00%',
  percent0: '0%',
  percent1: '0.0%',
  points: '+0.00" pp";-0.00" pp";0.00" pp"',
  date: 'dd/mm/yyyy',
  dateTime: 'dd/mm/yyyy hh:mm',
}

// Formato de celda de los montos con el símbolo y los decimales de la moneda de Reportes.
function currencyNumFmt(): string {
  const digits = reportCurrencyDigits()
  const number = `#,##0${digits > 0 ? `.${'0'.repeat(digits)}` : ''}`
  const symbol = `"${reportCurrencySymbol().replace(/"/g, '')}"`
  return `${symbol} ${number};-${symbol} ${number}`
}

const numFmt = (format: ValueFormat) => (format === 'currency' ? currencyNumFmt() : NUM_FMT[format])

const COLORS = {
  ink: 'FF14202B',
  muted: 'FF5D6D7E',
  headerFill: 'FF13222F',
  headerText: 'FFFFFFFF',
  subtotalFill: 'FFEEF2F6',
  warningFill: 'FFFFF4E0',
  amber: 'FFB26A00',
}

const fill = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const CHART_WIDTH_PX = 900
const ROW_HEIGHT_PX = 20
const MIN_COLUMN_WIDTH = 8
const MAX_COLUMN_WIDTH = 48

// Las Date de Reports son hora de pared de Santo Domingo en los campos locales; Excel no tiene zona,
// así que se pasan como UTC con esos mismos campos (si no, se correría el offset del navegador).
const asExcelDate = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()))

function excelValue(value: CellValue | undefined, format: ValueFormat): ExcelJS.CellValue {
  if (value === undefined || value === '') return null
  if (value === null) return '—'
  if (value instanceof Date) return asExcelDate(value)
  if (typeof value === 'number') {
    if (format.startsWith('percent')) return value / 100
    // Montos a centavos (como en pantalla): sin restos de punto flotante al sumar en Excel.
    if (format === 'currency') return Math.round(value * 100) / 100
  }
  return value
}

class SheetWriter {
  row = 1
  private widths: number[] = []

  readonly sheet: ExcelJS.Worksheet

  constructor(sheet: ExcelJS.Worksheet) {
    this.sheet = sheet
  }

  // Escribe una fila de valores y devuelve la fila de Excel para darle estilo.
  write(values: { value: ExcelJS.CellValue; format?: ValueFormat; text?: string }[], indent = 0): ExcelJS.Row {
    const row = this.sheet.getRow(this.row++)
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1)
      cell.value = v.value
      const fmt = v.format && numFmt(v.format)
      if (fmt && v.value !== null && typeof v.value !== 'string') cell.numFmt = fmt
      if (typeof v.value === 'number' || v.value instanceof Date) cell.alignment = { horizontal: 'right' }
      const length = (v.text ?? String(v.value ?? '')).length + (i === 0 ? indent * 2 : 0)
      this.widths[i] = Math.max(this.widths[i] ?? 0, length)
    })
    return row
  }

  skip(n = 1) {
    this.row += n
  }

  // Textos largos (títulos, notas) que no deben ensanchar la primera columna.
  writeText(text: string, font: Partial<ExcelJS.Font>, rowFill?: string): ExcelJS.Row {
    const row = this.sheet.getRow(this.row++)
    row.getCell(1).value = text
    row.getCell(1).font = font
    if (rowFill) row.getCell(1).fill = fill(rowFill)
    return row
  }

  finish() {
    this.widths.forEach((w, i) => (this.sheet.getColumn(i + 1).width = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, w + 2))))
  }
}

function styleHeader(row: ExcelJS.Row, count: number) {
  for (let i = 1; i <= count; i++) {
    const cell = row.getCell(i)
    cell.fill = fill(COLORS.headerFill)
    cell.font = { bold: true, color: { argb: COLORS.headerText } }
    cell.alignment = { ...cell.alignment, vertical: 'middle', wrapText: true }
  }
}

function writeTable(w: SheetWriter, table: DocTable, doc: ReportDocument): { headerRow: number | null; lastRow: number } {
  const compared = compareColumnKeys(table)
  if (table.title) w.writeText(table.title, { bold: true, size: 12, color: { argb: COLORS.ink } })

  const headers = table.columns.flatMap((c) => (compared.has(c.key) ? [c.header, `${c.header} · ${doc.labels.previous}`, `${c.header} · ${doc.labels.change}`] : [c.header]))
  const alignRight = table.columns.flatMap((c) => (compared.has(c.key) ? [c.align === 'right', c.align === 'right', true] : [c.align === 'right']))
  let headerRow: number | null = null
  if (!table.hideHeader) {
    headerRow = w.row
    const row = w.write(headers.map((h) => ({ value: h })))
    styleHeader(row, headers.length)
    headers.forEach((_, i) => {
      if (alignRight[i]) row.getCell(i + 1).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true }
    })
  }

  const writeRow = (docRow: DocRow, kind: 'body' | 'child' | 'total') => {
    const values = table.columns.flatMap((c) => {
      const cell = cellOf(docRow.cells[c.key])
      const format = cell.format ?? c.format
      const main = { value: excelValue(cell.value, format), format, text: formatValue(cell.value, format) }
      if (!compared.has(c.key)) return [main]
      return [main, { value: excelValue(cell.previous, format), format, text: formatValue(cell.previous ?? '', format) }, { value: cell.change ?? null, text: cell.change }]
    })
    const row = w.write(values, kind === 'child' ? 2 : 0)
    // Estilo por celda según la columna de origen.
    let col = 1
    table.columns.forEach((c) => {
      const cell = cellOf(docRow.cells[c.key])
      const target = row.getCell(col)
      if (cell.strong || kind === 'total' || docRow.kind === 'subtotal') target.font = { bold: true }
      if (cell.tag === 'warning' || cell.tag === 'manual') target.font = { bold: true, color: { argb: COLORS.amber } }
      if (c.align === 'right') target.alignment = { horizontal: 'right' }
      if (compared.has(c.key)) {
        row.getCell(col + 1).font = { color: { argb: COLORS.muted } }
        row.getCell(col + 2).alignment = { horizontal: 'right' }
        col += 3
      } else col += 1
    })
    if (kind === 'child') {
      row.outlineLevel = 1
      row.getCell(1).alignment = { indent: 2 }
      row.getCell(1).font = { color: { argb: COLORS.muted } }
    }
    const rowFill = docRow.kind === 'subtotal' ? COLORS.subtotalFill : docRow.tone === 'warning' ? COLORS.warningFill : null
    for (let i = 1; i <= headers.length; i++) {
      if (rowFill) row.getCell(i).fill = fill(rowFill)
      if (kind === 'total') row.getCell(i).border = { top: { style: 'medium', color: { argb: COLORS.ink } } }
    }
  }

  table.rows.forEach((row) => {
    writeRow(row, 'body')
    row.children?.forEach((child) => writeRow(child, 'child'))
  })
  const lastRow = w.row - 1
  table.footer?.forEach((row) => writeRow(row, 'total'))
  if (table.rows.length === 0 && !table.footer?.length && table.emptyText) w.writeText(table.emptyText, { italic: true, color: { argb: COLORS.muted } })
  return { headerRow, lastRow }
}

function writeChart(w: SheetWriter, workbook: ExcelJS.Workbook, chart: DocChart, image: ChartImage) {
  const id = workbook.addImage({ base64: image.dataUrl, extension: 'jpeg' })
  const height = (image.height * CHART_WIDTH_PX) / image.width
  w.sheet.addImage(id, { tl: { col: 0, row: w.row - 1 }, ext: { width: CHART_WIDTH_PX, height } })
  w.skip(Math.ceil(height / ROW_HEIGHT_PX) + 1)

  // Datos de la gráfica debajo de la imagen.
  const reference = chart.type === 'barChart' ? chart.reference : undefined
  const headers = [chart.categoryLabel, ...chart.series.map((s) => s.label), ...(reference ? [reference.label] : [])]
  styleHeader(
    w.write(headers.map((h) => ({ value: h }))),
    headers.length,
  )
  const format = chart.valueFormat === 'roundCount' ? 'count' : chart.valueFormat === 'compactCurrency' ? 'currency' : chart.valueFormat === 'percentAxis' ? 'percent' : chart.valueFormat === 'pointsAxis' ? 'points' : chart.valueFormat
  chart.categories.forEach((category, i) => {
    w.write([
      { value: category },
      ...chart.series.map((s) => ({ value: excelValue(s.values[i] ?? null, format), format })),
      ...(reference ? [{ value: excelValue(reference.value, format), format }] : []),
    ])
  })
}

function sheetName(title: string, used: Set<string>): string {
  const base = title.replace(/[\\/*?:[\]]/g, '').slice(0, 28).trim() || 'Hoja'
  let name = base
  for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base} ${n}`
  used.add(name.toLowerCase())
  return name
}

// Con secciones (archivos de "Todos los juegos"), la hoja lleva el juego delante del nombre
// ("Ruleta · Por tipo de apuesta") y el título de la sección arriba.
function writePanelSheet(workbook: ExcelJS.Workbook, panel: DocPanel, doc: ReportDocument, charts: ChartImages, used: Set<string>, section: DocSection | null) {
  const name = section ? `${section.short} · ${panel.title}` : panel.title
  const sheet = workbook.addWorksheet(sheetName(name, used), { properties: { outlineProperties: { summaryBelow: false, summaryRight: false } } })
  const w = new SheetWriter(sheet)
  if (section) w.writeText(section.title, { bold: true, color: { argb: COLORS.muted } })
  w.writeText(panel.title, { bold: true, size: 14, color: { argb: COLORS.ink } })
  if (panel.subtitle) w.writeText(panel.subtitle, { italic: true, color: { argb: COLORS.muted } })
  w.skip()

  panel.content.forEach((item, i) => {
    if (i > 0) w.skip()
    if (item.type !== 'table') {
      writeChart(w, workbook, item, charts[chartKey(panel.key, i)])
      return
    }
    const { headerRow, lastRow } = writeTable(w, item, doc)
    // Hoja con una sola tabla: encabezado fijo y filtros.
    if (panel.content.length === 1 && headerRow) {
      sheet.views = [{ state: 'frozen', ySplit: headerRow }]
      const columns = item.columns.length + compareColumnKeys(item).size * 2
      if (lastRow > headerRow) sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: lastRow, column: columns } }
    }
  })
  w.finish()
}

function writeSummarySheet(workbook: ExcelJS.Workbook, doc: ReportDocument, used: Set<string>) {
  const sheet = workbook.addWorksheet(sheetName(doc.labels.summarySheet, used))
  const w = new SheetWriter(sheet)
  w.writeText(doc.title, { bold: true, size: 16, color: { argb: COLORS.ink } })
  w.skip()
  doc.meta.forEach((m) => {
    const row = w.write([{ value: m.label }, { value: m.value }])
    row.getCell(1).font = { bold: true }
  })

  for (const block of doc.blocks) {
    if (block.type === 'section') {
      w.skip(2)
      w.writeText(block.title, { bold: true, size: 14, color: { argb: COLORS.ink } }, COLORS.subtotalFill)
    } else if (block.type === 'note') {
      w.skip()
      w.writeText(block.text, { italic: true, color: { argb: COLORS.muted } })
    } else if (block.type === 'alert') {
      w.skip()
      w.writeText(block.text, { bold: true, color: { argb: COLORS.amber } }, COLORS.warningFill)
    } else if (block.type === 'stats') {
      w.skip()
      w.writeText(doc.labels.indicators, { bold: true, size: 12, color: { argb: COLORS.ink } })
      const withPrevious = block.stats.some((s) => s.previous !== undefined)
      const headers = [doc.labels.indicator, doc.labels.value, ...(withPrevious ? [doc.labels.previous, doc.labels.change] : [])]
      styleHeader(
        w.write(headers.map((h) => ({ value: h }))),
        headers.length,
      )
      block.stats.forEach((s) => {
        const row = w.write([
          { value: s.label },
          { value: excelValue(s.value, s.format), format: s.format, text: formatValue(s.value, s.format) },
          ...(withPrevious ? [{ value: excelValue(s.previous, s.format), format: s.format, text: formatValue(s.previous ?? '', s.format) }, { value: s.change ?? null }] : []),
        ])
        row.getCell(2).font = { bold: true, color: s.tone === 'warning' ? { argb: COLORS.amber } : undefined }
        row.getCell(2).alignment = { horizontal: 'right' }
        if (withPrevious) row.getCell(4).alignment = { horizontal: 'right' }
      })
    }
  }
  w.finish()
}

export async function buildExcel(doc: ReportDocument, charts: ChartImages): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  workbook.created = new Date()
  const used = new Set<string>()
  writeSummarySheet(workbook, doc, used)
  let section: DocSection | null = null
  for (const block of doc.blocks) {
    if (block.type === 'section') section = block
    else if (block.type === 'panel') writePanelSheet(workbook, block, doc, charts, used, section)
    else if (block.type === 'row') block.panels.forEach((panel) => writePanelSheet(workbook, panel, doc, charts, used, section))
  }
  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
