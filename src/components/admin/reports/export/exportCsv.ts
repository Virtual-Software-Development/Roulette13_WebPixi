import { formatDate, formatDateTime } from '../../../../utils/reportFormat'
import { cellOf, type CellValue, type DocChart, type DocColumn, type DocRow, type DocTable, type ReportDocument, type ValueFormat } from '../document/reportDocument'
import { compareColumnKeys, unitHeader } from './exportShared'

// CSV: todo el documento en un solo archivo, una sección por panel (título, encabezados, filas),
// separadas por una línea en blanco. Valores sin formato (1234.50, 95.23) para que se puedan
// sumar al abrirlo; la unidad va en el encabezado ("Venta (RD$)", "RTP (%)", según la moneda). Las gráficas van
// como su tabla de datos. BOM UTF-8 + CRLF: Excel lo abre con acentos y filas bien.

const CHILD_INDENT = '    '

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

const csvRow = (values: string[]) => values.map(csvCell).join(',')

function rawValue(value: CellValue | undefined, format: ValueFormat): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return format === 'date' ? formatDate(value) : formatDateTime(value)
  if (typeof value === 'string') return value
  switch (format) {
    case 'count':
      return String(Math.round(value))
    case 'percent0':
      return value.toFixed(0)
    case 'percent1':
      return value.toFixed(1)
    case 'currency':
    case 'percent':
    case 'points':
      return value.toFixed(2)
    default:
      return String(value)
  }
}

function tableLines(table: DocTable, doc: ReportDocument): string[] {
  const compared = compareColumnKeys(table)
  const header = table.columns.flatMap((c) =>
    compared.has(c.key) ? [unitHeader(c.header, c.format), `${unitHeader(c.header, c.format)} · ${doc.labels.previous}`, `${c.header} · ${doc.labels.change}`] : [unitHeader(c.header, c.format)],
  )
  const rowValues = (row: DocRow, indent: string) =>
    table.columns.flatMap((c: DocColumn, i) => {
      const cell = cellOf(row.cells[c.key])
      const format = cell.format ?? c.format
      const value = (i === 0 ? indent : '') + rawValue(cell.value, format)
      return compared.has(c.key) ? [value, rawValue(cell.previous, format), cell.change ?? ''] : [value]
    })

  const lines: string[] = []
  if (table.title) lines.push(csvRow([table.title]))
  if (!table.hideHeader) lines.push(csvRow(header))
  table.rows.forEach((row) => {
    lines.push(csvRow(rowValues(row, '')))
    row.children?.forEach((child) => lines.push(csvRow(rowValues(child, CHILD_INDENT))))
  })
  table.footer?.forEach((row) => lines.push(csvRow(rowValues(row, ''))))
  if (table.rows.length === 0 && !table.footer?.length && table.emptyText) lines.push(csvRow([table.emptyText]))
  return lines
}

function chartLines(chart: DocChart): string[] {
  const series = chart.series
  return [
    csvRow([chart.categoryLabel, ...series.map((s) => s.label), ...(chart.type === 'barChart' && chart.reference ? [chart.reference.label] : [])]),
    ...chart.categories.map((category, i) =>
      csvRow([
        category,
        ...series.map((s) => (s.values[i] === null || s.values[i] === undefined ? '' : String(Number(s.values[i]!.toFixed(4))))),
        ...(chart.type === 'barChart' && chart.reference ? [chart.reference.value.toFixed(2)] : []),
      ]),
    ),
  ]
}

export function buildCsv(doc: ReportDocument): Blob {
  const lines: string[] = [csvRow([doc.title]), ...doc.meta.map((m) => csvRow([m.label, m.value])), '']

  for (const block of doc.blocks) {
    if (block.type === 'section') {
      lines.push(csvRow([`=== ${block.title} ===`]), '')
      continue
    }
    if (block.type === 'note' || block.type === 'alert') {
      lines.push(csvRow([block.text]), '')
      continue
    }
    if (block.type === 'stats') {
      const withPrevious = block.stats.some((s) => s.previous !== undefined)
      lines.push(csvRow([doc.labels.indicators]))
      lines.push(csvRow([doc.labels.indicator, doc.labels.value, ...(withPrevious ? [doc.labels.previous, doc.labels.change] : [])]))
      block.stats.forEach((s) =>
        lines.push(csvRow([unitHeader(s.label, s.format), rawValue(s.value, s.format), ...(withPrevious ? [rawValue(s.previous, s.format), s.change ?? ''] : [])])),
      )
      lines.push('')
      continue
    }
    const panels = block.type === 'panel' ? [block] : block.panels
    for (const panel of panels) {
      lines.push(csvRow([panel.title]))
      if (panel.subtitle) lines.push(csvRow([panel.subtitle]))
      panel.content.forEach((item, i) => {
        if (i > 0) lines.push('')
        lines.push(...(item.type === 'table' ? tableLines(item, doc) : chartLines(item)))
      })
      lines.push('')
    }
  }

  return new Blob(['﻿', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
}
