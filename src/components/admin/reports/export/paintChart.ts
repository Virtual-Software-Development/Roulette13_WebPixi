import { documentPanels, formatChartValue, type DocBarChart, type DocChart, type DocLineChart, type ReportDocument } from '../document/reportDocument'
import { niceTicks } from '../shared/chartScale'
import { chartKey, type ChartImage, type ChartImages } from './exportShared'

// Las gráficas de pantalla son SVG de React (con medición del contenedor y hover). Para el PDF y
// el Excel se dibujan acá en un canvas con las mismas reglas (escala, márgenes, barras con el
// extremo redondeado, banda, marcas) sobre fondo blanco, y se insertan como imagen (JPEG). Se
// dibujan en la página (necesitan canvas y la fuente cargada) antes de pasar el documento al worker.

const THEME = {
  background: '#ffffff',
  grid: '#e6ebf0',
  baseline: '#9aa8b6',
  axisText: '#5d6d7e',
  legendText: '#2a3846',
  reference: '#6b7d90',
  band: '#43e86a',
  marker: '#f0a83c',
  pointFill: '#ffffff',
}
const FONT = '500 11px Poppins, Arial, sans-serif'
const LEGEND_HEIGHT = 26
const SCALE = 2
const CHART_WIDTH = 1000
const JPEG_QUALITY = 0.92
const MIN_PX_PER_LABEL = 46
const BAR_MARGIN = { top: 14, right: 10, bottom: 28, left: 74 }
const LINE_MARGIN = { top: 14, right: 14, bottom: 28, left: 56 }
const MAX_GROUP_WIDTH = 64
const GROUP_WIDTH_RATIO = 0.62
const BAR_GAP = 2
const CORNER_RADIUS = 4

interface LegendItem {
  label: string
  color: string
  kind: 'swatch' | 'dash' | 'band' | 'marker'
}

function drawLegend(ctx: CanvasRenderingContext2D, items: LegendItem[], width: number) {
  ctx.font = FONT
  ctx.textBaseline = 'middle'
  const y = LEGEND_HEIGHT / 2 - 2
  const widths = items.map((item) => 18 + ctx.measureText(item.label).width)
  const gap = 18
  let x = Math.max(0, width - widths.reduce((a, b) => a + b, 0) - gap * (items.length - 1))
  items.forEach((item, i) => {
    ctx.save()
    if (item.kind === 'swatch' || item.kind === 'band') {
      ctx.globalAlpha = item.kind === 'band' ? 0.35 : 1
      ctx.fillStyle = item.color
      ctx.beginPath()
      ctx.roundRect(x, y - 5, 10, 10, 2)
      ctx.fill()
    } else if (item.kind === 'dash') {
      ctx.strokeStyle = item.color
      ctx.lineWidth = 2
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + 12, y)
      ctx.stroke()
    } else {
      ctx.fillStyle = item.color
      ctx.fillRect(x + 4, y - 6, 3, 12)
    }
    ctx.restore()
    ctx.fillStyle = THEME.legendText
    ctx.fillText(item.label, x + 16, y)
    x += widths[i] + gap
  })
}

function drawYAxis(ctx: CanvasRenderingContext2D, ticks: number[], yFor: (v: number) => number, left: number, right: number, format: (v: number) => string, zeroBaseline: boolean) {
  ctx.font = FONT
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (const tick of ticks) {
    ctx.strokeStyle = zeroBaseline && tick === 0 ? THEME.baseline : THEME.grid
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(left, Math.round(yFor(tick)) + 0.5)
    ctx.lineTo(right, Math.round(yFor(tick)) + 0.5)
    ctx.stroke()
    ctx.fillStyle = THEME.axisText
    ctx.fillText(format(tick), left - 8, yFor(tick))
  }
}

// Rect con las esquinas del extremo de dato redondeadas (arriba si es positivo, abajo si negativo).
function barPath(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, width: number) {
  const top = Math.min(y0, y1)
  const height = Math.abs(y1 - y0)
  const r = Math.min(CORNER_RADIUS, width / 2, height)
  ctx.beginPath()
  if (y1 <= y0) ctx.roundRect(x, top, width, height, [r, r, 0, 0])
  else ctx.roundRect(x, top, width, height, [0, 0, r, r])
}

function paintBar(ctx: CanvasRenderingContext2D, chart: DocBarChart, width: number, height: number) {
  const m = BAR_MARGIN
  const plotWidth = width - m.left - m.right
  const plotHeight = height - m.top - m.bottom
  const values = [...chart.series.flatMap((s) => s.values), chart.reference?.value ?? 0, 0]
  const { min, max, ticks } = niceTicks(Math.min(...values), Math.max(...values))
  const yFor = (v: number) => m.top + plotHeight - ((v - min) / (max - min || 1)) * plotHeight
  const count = Math.max(chart.categories.length, 1)
  const slotWidth = plotWidth / count
  const groupWidth = Math.min(MAX_GROUP_WIDTH, slotWidth * GROUP_WIDTH_RATIO)
  const barWidth = Math.max(1, (groupWidth - BAR_GAP * (chart.series.length - 1)) / chart.series.length)
  const labelEvery = Math.max(1, Math.ceil(MIN_PX_PER_LABEL / slotWidth))
  const zeroY = yFor(0)

  drawYAxis(ctx, ticks, yFor, m.left, width - m.right, (v) => formatChartValue(v, chart.axisFormat ?? chart.valueFormat), true)

  chart.categories.forEach((label, i) => {
    const slotX = m.left + slotWidth * i
    chart.series.forEach((s, si) => {
      const value = s.values[i] ?? 0
      if (value === 0) return
      const x = slotX + (slotWidth - groupWidth) / 2 + si * (barWidth + BAR_GAP)
      ctx.fillStyle = s.color
      barPath(ctx, x, zeroY, yFor(value), barWidth)
      ctx.fill()
    })
    if (i % labelEvery === 0) {
      ctx.fillStyle = THEME.axisText
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(label, slotX + slotWidth / 2, height - 8)
    }
  })

  if (chart.reference) {
    ctx.save()
    ctx.strokeStyle = THEME.reference
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.moveTo(m.left, yFor(chart.reference.value))
    ctx.lineTo(width - m.right, yFor(chart.reference.value))
    ctx.stroke()
    ctx.restore()
  }
}

function paintLine(ctx: CanvasRenderingContext2D, chart: DocLineChart, width: number, height: number) {
  const m = LINE_MARGIN
  const plotWidth = width - m.left - m.right
  const plotHeight = height - m.top - m.bottom
  const values = chart.series.flatMap((s) => s.values.filter((v): v is number => v !== null))
  const band = chart.band
  // Con banda, margen arriba y abajo: si no, la banda llena todo el gráfico (igual que en pantalla).
  const bandPad = band ? (band.max - band.min) * 0.25 : 0
  const rawMin = Math.min(...values, band ? band.min - bandPad : Infinity)
  const rawMax = Math.max(...values, band ? band.max + bandPad : -Infinity)
  const { min, max, ticks } = niceTicks(Number.isFinite(rawMin) ? rawMin : 0, Number.isFinite(rawMax) ? rawMax : 1)
  const yFor = (v: number) => m.top + plotHeight - ((v - min) / (max - min || 1)) * plotHeight
  const count = chart.categories.length
  const xFor = (i: number) => m.left + (count > 1 ? (i / (count - 1)) * plotWidth : plotWidth / 2)
  const slotWidth = plotWidth / Math.max(count - 1, 1)
  const labelEvery = Math.max(1, Math.ceil(MIN_PX_PER_LABEL / slotWidth))

  if (band) {
    ctx.save()
    ctx.globalAlpha = 0.12
    ctx.fillStyle = THEME.band
    ctx.fillRect(m.left, yFor(band.max), plotWidth, yFor(band.min) - yFor(band.max))
    ctx.restore()
  }
  drawYAxis(ctx, ticks, yFor, m.left, width - m.right, (v) => formatChartValue(v, chart.axisFormat ?? chart.valueFormat), false)

  ctx.fillStyle = THEME.axisText
  ctx.textBaseline = 'alphabetic'
  chart.categories.forEach((label, i) => {
    if (i % labelEvery !== 0) return
    ctx.textAlign = i === 0 ? 'left' : 'center'
    ctx.fillText(label, xFor(i), height - 8)
  })

  ctx.save()
  ctx.strokeStyle = THEME.marker
  ctx.lineWidth = 1.5
  ctx.setLineDash([3, 3])
  for (const marker of chart.markers ?? []) {
    ctx.beginPath()
    ctx.moveTo(xFor(marker.index), m.top)
    ctx.lineTo(xFor(marker.index), m.top + plotHeight)
    ctx.stroke()
  }
  ctx.restore()

  for (const s of chart.series) {
    ctx.save()
    ctx.strokeStyle = s.color
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    if (s.dashed) ctx.setLineDash([6, 5])
    ctx.beginPath()
    let pen = false
    s.values.forEach((v, i) => {
      if (v === null) {
        pen = false
        return
      }
      if (pen) ctx.lineTo(xFor(i), yFor(v))
      else ctx.moveTo(xFor(i), yFor(v))
      pen = true
    })
    ctx.stroke()
    ctx.restore()
  }

  if (count <= 16) {
    for (const s of chart.series.filter((x) => !x.dashed)) {
      s.values.forEach((v, i) => {
        if (v === null) return
        ctx.beginPath()
        ctx.arc(xFor(i), yFor(v), 4, 0, Math.PI * 2)
        ctx.fillStyle = THEME.pointFill
        ctx.fill()
        ctx.strokeStyle = s.color
        ctx.lineWidth = 2
        ctx.stroke()
      })
    }
  }
}

function legendItems(chart: DocChart): LegendItem[] {
  if (chart.type === 'barChart') {
    const items: LegendItem[] = chart.series.length > 1 ? chart.series.map((s) => ({ label: s.label, color: s.color, kind: 'swatch' })) : []
    if (chart.reference) items.push({ label: chart.reference.label, color: THEME.reference, kind: 'dash' })
    return items
  }
  const items: LegendItem[] = chart.series.map((s) => ({ label: s.label, color: s.color, kind: s.dashed ? 'dash' : 'swatch' }))
  if (chart.band) items.push({ label: chart.band.label, color: THEME.band, kind: 'band' })
  if (chart.markers?.length && chart.markerLegend) items.push({ label: chart.markerLegend, color: THEME.marker, kind: 'marker' })
  return items
}

function renderChartImage(chart: DocChart, width: number): ChartImage {
  const legend = legendItems(chart)
  const plotHeight = chart.height ?? 280
  const height = plotHeight + (legend.length > 0 ? LEGEND_HEIGHT : 0)
  const canvas = document.createElement('canvas')
  canvas.width = width * SCALE
  canvas.height = height * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = THEME.background
  ctx.fillRect(0, 0, width, height)
  if (legend.length > 0) {
    drawLegend(ctx, legend, width)
    ctx.translate(0, LEGEND_HEIGHT)
  }
  if (chart.type === 'barChart') paintBar(ctx, chart, width, plotHeight)
  else paintLine(ctx, chart, width, plotHeight)
  // JPEG y no PNG: jsPDF inserta el JPEG tal cual, mientras que un PNG lo descomprime y lo vuelve a
  // comprimir en JavaScript (~0.9 s por gráfica en hardware lento). El fondo es blanco, sin alfa.
  return { dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY), width, height }
}

export async function renderDocumentCharts(doc: ReportDocument): Promise<ChartImages> {
  // Espera la fuente de la pantalla (Poppins, cargada desde index.html); si no está, Arial.
  try {
    await document.fonts.load(FONT)
  } catch {
    // sin la fuente se dibuja con la de respaldo
  }
  const images: ChartImages = {}
  for (const panel of documentPanels(doc)) {
    panel.content.forEach((item, i) => {
      if (item.type !== 'table') images[chartKey(panel.key, i)] = renderChartImage(item, CHART_WIDTH)
    })
  }
  return images
}
