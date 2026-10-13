import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { buildReportDocument, periodKindOf } from '../components/admin/reports/document/buildReportDocument'
import { cellOf, documentPanels, type DocPanel, type DocTable, type ReportDocument } from '../components/admin/reports/document/reportDocument'
import { buildCsv } from '../components/admin/reports/export/exportCsv'
import { buildExcel } from '../components/admin/reports/export/exportExcel'
import { setReportCurrency } from '../utils/reportFormat'
import type { ReportGameFilter, ReportType } from '../types/adminReports'
import { monthPeriods, presetPeriod, type ReportPeriod } from '../utils/reportPeriod'

// Lunes 12/10/2026 15:30 (misma referencia que reportPeriod.test.ts).
const NOW = new Date(2026, 9, 12, 15, 30)
const TYPES: ReportType[] = ['summary', 'gameReport', 'salesActivity', 'financialReport', 'rtpAnalysis', 'weeklyReport', 'monthlyReport', 'manualSubstitutions']
const GAMES: ReportGameFilter[] = ['all', 'roulette', 'pick3', 'pick4']

function build(type: ReportType, game: ReportGameFilter, period: ReportPeriod = presetPeriod('last7Days', NOW)): ReportDocument {
  return buildReportDocument({ type, period, kind: periodKindOf(type), game, now: NOW, generatedBy: 'Admin', generatedAt: '12/10/2026 15:30' }, i18n.getFixedT('es'), 'es')
}

const tables = (doc: ReportDocument) => documentPanels(doc).flatMap((p) => p.content.filter((c): c is DocTable => c.type === 'table'))
const numberAt = (table: DocTable, rowIndex: number, key: string, footer = false) => cellOf((footer ? table.footer! : table.rows)[rowIndex].cells[key]).value as number

describe('buildReportDocument', () => {
  it('builds every report type for every game', () => {
    for (const type of TYPES) {
      for (const game of GAMES) {
        const doc = build(type, game)
        expect(doc.blocks.length).toBeGreaterThan(0)
        expect(doc.meta.map((m) => m.value)).toContain('Admin')
      }
    }
  })

  it('splits the monthly table by week and the subtotals add up to the month total', () => {
    const doc = build('monthlyReport', 'all', monthPeriods(NOW)[1])
    const byDay = documentPanels(doc).find((p) => p.key === 'byDay')!
    const weeks = byDay.content.filter((c): c is DocTable => c.type === 'table' && !c.hideHeader)
    const monthTotal = byDay.content.find((c): c is DocTable => c.type === 'table' && !!c.hideHeader)!
    expect(weeks.length).toBeGreaterThanOrEqual(4)
    expect(weeks.reduce((sum, w) => sum + w.rows.length - 1, 0)).toBe(30)
    const subtotalSales = weeks.reduce((sum, w) => sum + numberAt(w, w.rows.length - 1, 'sales'), 0)
    expect(subtotalSales).toBeCloseTo(numberAt(monthTotal, 0, 'sales', true), 6)
  })

  it('keeps every row in the document even when the screen paginates it', () => {
    const doc = build('gameReport', 'roulette', presetPeriod('yesterday', NOW))
    const rounds = tables(doc).find((t) => t.pageSize === 15)!
    expect(rounds.rows).toHaveLength(24 * 60)
  })
})

describe('archivos con "Todos los juegos" (byGame)', () => {
  const files = (type: ReportType, game: ReportGameFilter, period: ReportPeriod = presetPeriod('last7Days', NOW)) =>
    buildReportDocument({ type, period, kind: periodKindOf(type), game, now: NOW, generatedBy: '', generatedAt: '', byGame: true }, i18n.getFixedT('es'), 'es')

  it('adds the full report of every game in its own section after the combined one', () => {
    for (const type of TYPES.filter((t) => t !== 'manualSubstitutions')) {
      const doc = files(type, 'all')
      expect(doc.blocks.filter((b) => b.type === 'section').map((b) => b.type === 'section' && b.key)).toEqual(['all', 'roulette', 'pick3', 'pick4'])
      const keys = documentPanels(doc).map((p) => p.key)
      expect(new Set(keys).size).toBe(keys.length)
      // Cada sección trae los mismos paneles que el reporte de ese juego solo.
      const single = documentPanels(build(type, 'pick3')).map((p) => `pick3.${p.key}`)
      expect(keys.filter((k) => k.startsWith('pick3.'))).toEqual(single)
    }
  })

  it('leaves single-game files and the screen document unchanged', () => {
    expect(files('gameReport', 'roulette').blocks.some((b) => b.type === 'section')).toBe(false)
    expect(build('gameReport', 'all').blocks.some((b) => b.type === 'section')).toBe(false)
    expect(files('manualSubstitutions', 'all').blocks.some((b) => b.type === 'section')).toBe(false)
  })

  it('names the Excel sheets of each section after its game', async () => {
    // Un día y sin gráficas (necesitan canvas para pintarse): acá solo importan los nombres de las hojas.
    const doc = files('gameReport', 'all', presetPeriod('yesterday', NOW))
    const tablesOnly = (panel: DocPanel): DocPanel => ({ ...panel, content: panel.content.filter((c) => c.type === 'table') })
    doc.blocks = doc.blocks.map((b) => (b.type === 'panel' ? tablesOnly(b) : b.type === 'row' ? { ...b, panels: b.panels.map(tablesOnly) } : b))
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await (await buildExcel(doc, {})).arrayBuffer())
    const names = workbook.worksheets.map((s) => s.name)
    expect(names[0]).toBe('Resumen')
    expect(names).toContain('Todos · Por juego')
    expect(names.some((n) => n.startsWith('Ruleta · '))).toBe(true)
    expect(names.some((n) => n.startsWith('Pick 4 · '))).toBe(true)
  })
})

describe('buildCsv', () => {
  it('exports the substitutions report with its sections, units and one row per day', async () => {
    const doc = build('manualSubstitutions', 'roulette')
    const blob = buildCsv(doc)
    // BOM UTF-8 (Blob.text() lo quita al decodificar).
    expect([...new Uint8Array(await blob.slice(0, 3).arrayBuffer())]).toEqual([0xef, 0xbb, 0xbf])
    const csv = await blob.text()
    expect(csv.startsWith('Sustituciones Manuales')).toBe(true)
    expect(csv).toContain('Indicador,Valor,Período anterior,Variación')
    expect(csv).toContain('Desglose por Operador')
    expect(csv).toContain('Impacto RTP (pp)')
    expect(csv.split('\r\n').filter((line) => /^\d{2}\/\d{2},\d+,\d+,/.test(line))).toHaveLength(7)
  })

  it('opens comparison columns into value, previous and change', async () => {
    const csv = await buildCsv(build('weeklyReport', 'all', presetPeriod('last7Days', NOW))).text()
    expect(csv).toContain('Venta (RD$),Venta (RD$) · Semana anterior,Venta · Variación')
  })
})

describe('buildExcel', () => {
  it('writes a summary sheet and one sheet per panel with real numbers', async () => {
    const doc = build('gameReport', 'all')
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await (await buildExcel(doc, {})).arrayBuffer())
    expect(workbook.worksheets.map((s) => s.name)).toEqual(['Resumen', 'Por juego'])
    const sheet = workbook.getWorksheet('Por juego')!
    const header = sheet.getRow(4)
    expect(header.getCell(1).value).toBe('Juego')
    const firstSales = sheet.getRow(5).getCell(5)
    expect(typeof firstSales.value).toBe('number')
    expect(firstSales.numFmt).toContain('RD$')
  })

  it('formats amounts with the currency the document was built with', async () => {
    try {
      setReportCurrency('USD')
      const doc = build('gameReport', 'all')
      expect(doc.currency).toBe('USD')
      const csv = await buildCsv(doc).text()
      expect(csv).toContain('(US$)')
      expect(csv).not.toContain('RD$')
      // El worker recibe el documento con su moneda y la aplica antes de armar el archivo.
      setReportCurrency('DOP')
      setReportCurrency(doc.currency)
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await (await buildExcel(doc, {})).arrayBuffer())
      expect(workbook.getWorksheet('Por juego')!.getRow(5).getCell(5).numFmt).toBe('"US$" #,##0.00;-"US$" #,##0.00')
    } finally {
      setReportCurrency('DOP')
    }
  })
})
