import { jsPDF } from 'jspdf'
import { autoTable, type CellHookData } from 'jspdf-autotable'
import { cellOf, formatValue, type DocPanel, type DocRow, type DocSection, type DocStat, type DocTable, type ReportDocument } from '../document/reportDocument'
import { chartKey, type ChartImages } from './exportShared'

// PDF: A4 horizontal con el mismo contenido y orden que la pantalla -- encabezado del reporte,
// indicadores, gráficas y tablas completas (sin paginar: todas las filas, con las máquinas
// debajo de su banca). Lo que no entra pasa a la página siguiente, repitiendo el encabezado de la
// tabla. Fondo blanco (para imprimir), con la fuente (Poppins) y los colores de la pantalla.

const FONT = 'Poppins'
const FONT_FILES = [
  { file: 'Poppins-Regular.ttf', style: 'normal' },
  { file: 'Poppins-SemiBold.ttf', style: 'bold' },
] as const

const C = {
  ink: '#14202b',
  muted: '#5d6d7e',
  faint: '#8b98a6',
  line: '#e3e8ee',
  band: '#0b1620',
  bandText: '#9fb1c3',
  headerFill: '#13222f',
  tileFill: '#f3f6f9',
  tileBorder: '#dfe5eb',
  subtotalFill: '#eef2f6',
  warningFill: '#fff4e0',
  amber: '#b26a00',
  amberBorder: '#f0a83c',
}

const MARGIN = 32
const TOP = 40
const BOTTOM = 40
const HEADER_BAND = 78
const SECTION_BAND = 34
const TILE_GAP = 10
const MAX_TILES_PER_ROW = 4

let fontsPromise: Promise<{ file: string; style: string; base64: string }[]> | null = null

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

// La fuente se baja una sola vez (public/fonts/report, OFL) y se embebe en cada PDF.
function loadFonts() {
  fontsPromise ??= Promise.all(
    FONT_FILES.map(async ({ file, style }) => {
      const response = await fetch(`${import.meta.env.BASE_URL}fonts/report/${file}`)
      if (!response.ok) throw new Error(`No se pudo cargar la fuente ${file} (${response.status})`)
      return { file, style, base64: toBase64(await response.arrayBuffer()) }
    }),
  ).catch((error) => {
    fontsPromise = null
    throw error
  })
  return fontsPromise
}

interface RowMeta {
  kind: 'body' | 'child' | 'subtotal' | 'total'
  tone?: 'warning'
  cells: { strong?: boolean; tag?: string; sub?: string }[]
}

class PdfWriter {
  readonly pdf: jsPDF
  readonly width: number
  readonly height: number
  readonly contentWidth: number
  y = TOP
  // Página donde empieza cada sección: el encabezado de cada página dice a qué juego pertenece
  // (las tablas largas agregan páginas por su cuenta).
  readonly sectionStarts: { page: number; title: string }[] = []

  constructor(pdf: jsPDF) {
    this.pdf = pdf
    this.width = pdf.internal.pageSize.getWidth()
    this.height = pdf.internal.pageSize.getHeight()
    this.contentWidth = this.width - MARGIN * 2
  }

  ensureSpace(height: number) {
    if (this.y + height > this.height - BOTTOM) {
      this.pdf.addPage()
      this.y = TOP
    }
  }

  text(text: string | string[], x: number, y: number, size: number, color: string, bold = false, align: 'left' | 'right' | 'center' = 'left') {
    this.pdf.setFont(FONT, bold ? 'bold' : 'normal')
    this.pdf.setFontSize(size)
    this.pdf.setTextColor(color)
    this.pdf.text(text, x, y, { align })
  }
}

function drawHeader(w: PdfWriter, doc: ReportDocument) {
  const { pdf } = w
  pdf.setFillColor(C.band)
  pdf.rect(0, 0, w.width, HEADER_BAND, 'F')
  w.text(doc.title, MARGIN, 36, 18, '#ffffff', true)
  // "Etiqueta: valor" uno al lado del otro; si no entran, siguen en la línea de abajo (el
  // separador "·" va solo entre dos datos de la misma línea).
  pdf.setFont(FONT, 'normal')
  pdf.setFontSize(8)
  const separator = '   ·   '
  const lines: string[] = []
  for (const item of doc.meta.map((m) => `${m.label}: ${m.value}`)) {
    const last = lines.length - 1
    if (last >= 0 && pdf.getTextWidth(lines[last] + separator + item) <= w.contentWidth) lines[last] += separator + item
    else lines.push(item)
  }
  w.text(lines, MARGIN, 56, 8, C.bandText)
  w.y = HEADER_BAND + 22
}

// Cada sección empieza en página nueva (salvo la primera, debajo del encabezado), con una franja
// con su título.
function drawSection(w: PdfWriter, section: DocSection) {
  const { pdf } = w
  if (w.y > HEADER_BAND + 22) {
    pdf.addPage()
    w.y = TOP
  }
  w.sectionStarts.push({ page: pdf.getNumberOfPages(), title: section.title })
  pdf.setFillColor(C.subtotalFill)
  pdf.rect(MARGIN, w.y, w.contentWidth, SECTION_BAND, 'F')
  pdf.setFillColor(C.band)
  pdf.rect(MARGIN, w.y, 5, SECTION_BAND, 'F')
  w.text(section.title, MARGIN + 16, w.y + SECTION_BAND / 2 + 5, 14, C.ink, true)
  w.y += SECTION_BAND + 18
}

function drawNote(w: PdfWriter, text: string) {
  w.pdf.setFont(FONT, 'normal')
  w.pdf.setFontSize(8.5)
  const lines = w.pdf.splitTextToSize(text, w.contentWidth)
  w.ensureSpace(lines.length * 11 + 8)
  w.text(lines, MARGIN, w.y + 8, 8.5, C.muted)
  w.y += lines.length * 11 + 12
}

function drawWarningIcon(pdf: jsPDF, x: number, y: number, size: number) {
  pdf.setDrawColor(C.amber)
  pdf.setLineWidth(1.1)
  pdf.triangle(x + size / 2, y, x + size, y + size, x, y + size, 'S')
  pdf.line(x + size / 2, y + size * 0.38, x + size / 2, y + size * 0.66)
  pdf.setFillColor(C.amber)
  pdf.circle(x + size / 2, y + size * 0.82, 0.7, 'F')
}

function drawAlert(w: PdfWriter, text: string) {
  const { pdf } = w
  pdf.setFont(FONT, 'bold')
  pdf.setFontSize(8.5)
  const lines = pdf.splitTextToSize(text, w.contentWidth - 44)
  const height = lines.length * 11 + 16
  w.ensureSpace(height + 10)
  pdf.setFillColor(C.warningFill)
  pdf.setDrawColor(C.amberBorder)
  pdf.setLineWidth(0.8)
  pdf.roundedRect(MARGIN, w.y, w.contentWidth, height, 5, 5, 'FD')
  drawWarningIcon(pdf, MARGIN + 12, w.y + height / 2 - 6, 12)
  w.text(lines, MARGIN + 34, w.y + 12 + 6, 8.5, C.amber, true)
  w.y += height + 14
}

function drawChange(w: PdfWriter, change: string, x: number, y: number) {
  const sign = change.startsWith('+') ? 'up' : change.startsWith('−') ? 'down' : 'none'
  let cursor = x
  if (sign !== 'none') {
    w.pdf.setFillColor(C.ink)
    if (sign === 'up') w.pdf.triangle(cursor, y - 1, cursor + 5, y - 1, cursor + 2.5, y - 5, 'F')
    else w.pdf.triangle(cursor, y - 5, cursor + 5, y - 5, cursor + 2.5, y - 1, 'F')
    cursor += 7
  }
  w.text(change, cursor, y, 7, C.ink, true)
}

function drawStats(w: PdfWriter, stats: DocStat[], previousLabel: string | undefined) {
  const { pdf } = w
  const withPrevious = stats.some((s) => s.previous !== undefined)
  const perRow = Math.min(MAX_TILES_PER_ROW, stats.length)
  const tileWidth = (w.contentWidth - TILE_GAP * (perRow - 1)) / perRow
  const tileHeight = withPrevious ? 58 : 46
  for (let start = 0; start < stats.length; start += perRow) {
    w.ensureSpace(tileHeight + TILE_GAP)
    stats.slice(start, start + perRow).forEach((s, i) => {
      const x = MARGIN + i * (tileWidth + TILE_GAP)
      pdf.setFillColor(C.tileFill)
      pdf.setDrawColor(s.tone === 'warning' ? C.amberBorder : C.tileBorder)
      pdf.setLineWidth(s.tone === 'warning' ? 1 : 0.6)
      pdf.roundedRect(x, w.y, tileWidth, tileHeight, 5, 5, 'FD')
      w.text(s.label, x + 10, w.y + 14, 7.5, C.muted, true)
      w.text(formatValue(s.value, s.format), x + 10, w.y + 33, 14, C.ink, true)
      if (s.previous !== undefined) {
        const prefix = `${previousLabel ?? ''}: ${formatValue(s.previous, s.format)}  `
        w.text(prefix, x + 10, w.y + 48, 7, C.muted)
        if (s.change) drawChange(w, s.change, x + 10 + pdf.getTextWidth(prefix), w.y + 48)
      }
    })
    w.y += tileHeight + TILE_GAP
  }
  w.y += 8
}

function drawTable(w: PdfWriter, table: DocTable) {
  const { pdf } = w
  if (table.title) {
    w.ensureSpace(48)
    w.text(table.title, MARGIN, w.y + 8, 9.5, C.ink, true)
    w.y += 16
  }

  const metas: RowMeta[] = []
  const body: string[][] = []
  const addRow = (row: DocRow, kind: RowMeta['kind']) => {
    const cells = table.columns.map((c) => {
      const cell = cellOf(row.cells[c.key])
      const format = cell.format ?? c.format
      return {
        text: formatValue(cell.value, format),
        strong: cell.strong,
        tag: cell.tag,
        sub: cell.previous !== undefined ? `${formatValue(cell.previous, format)} · ${cell.change ?? ''}` : undefined,
      }
    })
    body.push(cells.map((c) => c.text))
    metas.push({ kind: row.kind === 'subtotal' ? 'subtotal' : kind, tone: row.tone, cells: cells })
  }
  table.rows.forEach((row) => {
    addRow(row, 'body')
    row.children?.forEach((child) => addRow(child, 'child'))
  })
  table.footer?.forEach((row) => addRow(row, 'total'))

  if (body.length === 0) {
    w.ensureSpace(20)
    w.text(table.emptyText ?? '—', MARGIN, w.y + 8, 8.5, C.muted)
    w.y += 22
    return
  }

  w.ensureSpace(40)
  const fixedWidth = table.fixedLayout ? w.contentWidth / table.columns.length : undefined
  autoTable(pdf, {
    startY: w.y,
    margin: { left: MARGIN, right: MARGIN, top: TOP, bottom: BOTTOM },
    head: table.hideHeader ? undefined : [table.columns.map((c) => c.header)],
    body,
    showHead: table.hideHeader ? 'never' : 'everyPage',
    theme: 'plain',
    rowPageBreak: 'avoid',
    styles: {
      font: FONT,
      fontSize: 7.5,
      textColor: C.ink,
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
      lineColor: C.line,
      lineWidth: { bottom: 0.5 },
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: { fillColor: C.headerFill, textColor: '#ffffff', fontStyle: 'bold', fontSize: 7, valign: 'bottom', lineWidth: 0 },
    columnStyles: Object.fromEntries(table.columns.map((c, i) => [i, { halign: c.align, cellWidth: fixedWidth ?? 'auto' }])),
    didParseCell: (data: CellHookData) => {
      if (data.section === 'head') {
        data.cell.styles.halign = table.columns[data.column.index].align
        return
      }
      const meta = metas[data.row.index]
      const cellMeta = meta.cells[data.column.index]
      const styles = data.cell.styles
      if (meta.kind === 'subtotal') {
        styles.fillColor = C.subtotalFill
        styles.fontStyle = 'bold'
        styles.textColor = C.muted
      } else if (meta.tone === 'warning') {
        styles.fillColor = C.warningFill
      }
      if (meta.kind === 'total' || cellMeta.strong) styles.fontStyle = 'bold'
      if (meta.kind === 'child') {
        styles.textColor = C.muted
        if (data.column.index === 0) styles.cellPadding = { top: 4, bottom: 4, left: 18, right: 5 }
      }
      if (cellMeta.tag === 'warning' || cellMeta.tag === 'manual') {
        styles.textColor = C.amber
        styles.fontStyle = 'bold'
      }
      // Comparación: segunda línea (anterior · variación) dibujada en didDrawCell, más chica.
      if (cellMeta.sub) data.cell.text = [data.cell.text.join(' '), '']
    },
    didDrawCell: (data: CellHookData) => {
      if (data.section !== 'body') return
      const meta = metas[data.row.index]
      const cell = data.cell
      if (meta.kind === 'total') {
        pdf.setDrawColor(C.ink)
        pdf.setLineWidth(1.2)
        pdf.line(cell.x, cell.y, cell.x + cell.width, cell.y)
      }
      if (meta.tone === 'warning' && data.column.index === 0) {
        pdf.setFillColor(C.amberBorder)
        pdf.rect(cell.x, cell.y, 2.2, cell.height, 'F')
      }
      const sub = meta.cells[data.column.index].sub
      if (sub) {
        const pos = cell.getTextPos()
        w.text(sub, pos.x, pos.y + cell.styles.fontSize * 0.85, 6.3, C.muted, false, cell.styles.halign === 'right' ? 'right' : 'left')
      }
    },
  })
  w.y = ((pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY ?? w.y) + 14
}

function drawPanel(w: PdfWriter, panel: DocPanel, charts: ChartImages) {
  const { pdf } = w
  pdf.setFont(FONT, 'normal')
  pdf.setFontSize(8.5)
  const subtitle = panel.subtitle ? pdf.splitTextToSize(panel.subtitle, w.contentWidth) : []
  // El título nunca queda solo al pie de una página: con una gráfica va entera con su título; con
  // una tabla, al menos sus primeras filas.
  const image = (i: number) => charts[chartKey(panel.key, i)]
  const imageHeight = (i: number) => (w.contentWidth * image(i).height) / image(i).width
  const headHeight = 30 + subtitle.length * 11
  w.ensureSpace(headHeight + (panel.content[0]?.type === 'table' ? 70 : imageHeight(0)))

  pdf.setDrawColor(C.line)
  pdf.setLineWidth(0.6)
  pdf.line(MARGIN, w.y, MARGIN + w.contentWidth, w.y)
  w.text(panel.title, MARGIN, w.y + 18, 12, C.ink, true)
  w.y += 24
  if (subtitle.length > 0) {
    w.text(subtitle, MARGIN, w.y + 9, 8.5, C.muted)
    w.y += subtitle.length * 11 + 2
  }
  w.y += 6

  panel.content.forEach((item, i) => {
    if (item.type === 'table') {
      drawTable(w, item)
      return
    }
    const height = imageHeight(i)
    w.ensureSpace(height + 8)
    pdf.addImage(image(i).dataUrl, 'JPEG', MARGIN, w.y, w.contentWidth, height)
    w.y += height + 14
  })
  w.y += 10
}

// Pie de página (reporte · período y "Página n de N") y, desde la segunda página, el título arriba.
function drawPageChrome(w: PdfWriter, doc: ReportDocument) {
  const { pdf } = w
  const pages = pdf.getNumberOfPages()
  const period = doc.meta[0]?.value ?? ''
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page)
    w.text(`${doc.title} · ${period}`, MARGIN, w.height - 18, 7.5, C.faint)
    w.text(`${doc.labels.page} ${page} ${doc.labels.of} ${pages}`, w.width - MARGIN, w.height - 18, 7.5, C.faint, false, 'right')
    const section = w.sectionStarts.findLast((start) => start.page <= page)
    if (page > 1) w.text(`${doc.title} · ${period}${section ? ` · ${section.title}` : ''}`, MARGIN, 24, 7.5, C.faint)
  }
}

export async function buildPdf(doc: ReportDocument, charts: ChartImages): Promise<Blob> {
  const fonts = await loadFonts()
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true })
  fonts.forEach(({ file, style, base64 }) => {
    pdf.addFileToVFS(file, base64)
    pdf.addFont(file, FONT, style)
  })
  pdf.setProperties({ title: doc.title, creator: 'Admin · Reportes' })

  const w = new PdfWriter(pdf)
  drawHeader(w, doc)
  for (const block of doc.blocks) {
    if (block.type === 'section') drawSection(w, block)
    else if (block.type === 'note') drawNote(w, block.text)
    else if (block.type === 'alert') drawAlert(w, block.text)
    else if (block.type === 'stats') drawStats(w, block.stats, doc.previousLabel)
    else if (block.type === 'panel') drawPanel(w, block, charts)
    else block.panels.forEach((panel) => drawPanel(w, panel, charts))
  }
  drawPageChrome(w, doc)
  return pdf.output('blob')
}
