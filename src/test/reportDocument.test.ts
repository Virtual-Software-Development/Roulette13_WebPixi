import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { buildReportDocument, periodKindOf } from '../components/admin/reports/document/buildReportDocument'
import { betTypeKey, machineActivity, totalsByDay, totalsByGame, totalsFor } from '../components/admin/reports/document/reportData'
import { cellOf, documentPanels, type DocPanel, type DocTable, type ReportDocument } from '../components/admin/reports/document/reportDocument'
import { buildCsv } from '../components/admin/reports/export/exportCsv'
import { buildExcel } from '../components/admin/reports/export/exportExcel'
import { setReportCurrency } from '../utils/reportFormat'
import type { ReportGameFilter, ReportType } from '../types/adminReports'
import { comparisonPeriod, monthPeriods, presetPeriod, type ReportPeriod } from '../utils/reportPeriod'
import { fixtureActivity, fixtureMachines, fixtureReportData } from './reportFixtures'

// Lunes 12/10/2026 15:30 (misma referencia que reportPeriod.test.ts).
const NOW = new Date(2026, 9, 12, 15, 30)
const TYPES: ReportType[] = ['summary', 'gameReport', 'salesActivity', 'financialReport', 'rtpAnalysis', 'weeklyReport', 'monthlyReport', 'manualSubstitutions']
const GAMES: ReportGameFilter[] = ['all', 'roulette', 'quickMoney']

function request(type: ReportType, game: ReportGameFilter, period: ReportPeriod, byGame?: boolean) {
  const kind = periodKindOf(type)
  return { type, period, kind, game, now: NOW, generatedBy: 'Admin', generatedAt: '12/10/2026 15:30', byGame, data: fixtureReportData(period, comparisonPeriod(period, kind)) }
}

function build(type: ReportType, game: ReportGameFilter, period: ReportPeriod = presetPeriod('last7Days', NOW)): ReportDocument {
  return buildReportDocument(request(type, game, period), i18n.getFixedT('es'), 'es')
}

const tables = (doc: ReportDocument) => documentPanels(doc).flatMap((p) => p.content.filter((c): c is DocTable => c.type === 'table'))
const panel = (doc: ReportDocument, key: string) => documentPanels(doc).find((p) => p.key === key)!
const firstTable = (doc: ReportDocument, key: string) => panel(doc, key).content.find((c): c is DocTable => c.type === 'table')!
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

  it('builds every report with no data at all', () => {
    for (const type of TYPES) {
      for (const game of GAMES) {
        const period = presetPeriod('today', NOW)
        const doc = buildReportDocument({ ...request(type, game, period), data: { activity: { days: [], hours: [] } } }, i18n.getFixedT('es'), 'es')
        expect(doc.blocks.length).toBeGreaterThan(0)
      }
    }
  })

  it('splits the monthly table by week and the subtotals add up to the month total', () => {
    const doc = build('monthlyReport', 'all', monthPeriods(NOW)[1])
    const byDay = panel(doc, 'byDay')
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
    expect(rounds.rows).toHaveLength(24)
  })

  it('uses the real Quick Money bet types', () => {
    const doc = build('gameReport', 'quickMoney')
    expect(firstTable(doc, 'betTypes').rows.map((r) => r.key)).toEqual(['single-1', 'straight-3', 'straight-4', 'pale-4'])
    expect(firstTable(doc, 'top').rows.map((r) => cellOf(r.cells.number).value)).toEqual(['47', '1905'])
    expect(firstTable(doc, 'digits').columns).toHaveLength(1 + 3 + 4)
    // Claves de admin.reports.views.betTypes: ruleta con las existentes, straight de Quick Money por dígitos.
    expect(betTypeKey('roulette', 'straight', 1)).toBe('pleno')
    expect(betTypeKey('roulette', 'red_black', 18)).toBe('color')
    expect(betTypeKey('quickMoney', 'straight', 3)).toBe('straight3')
    expect(betTypeKey('quickMoney', 'straight', 4)).toBe('straight4')
    expect(betTypeKey('quickMoney', 'pale', 4)).toBe('pale')
  })

  it('compares each game against its RTP target and band', () => {
    const roulette = build('rtpAnalysis', 'roulette')
    const stats = roulette.blocks.find((b) => b.type === 'stats')!
    const target = stats.type === 'stats' ? stats.stats.find((s) => s.key === 'target')!.value : null
    // 5 días a 95 % (con más rondas) y 2 a 94,74 %, ponderados por rondas.
    expect(target).toBeGreaterThan(94.74)
    expect(target).toBeLessThan(95)
    const quickMoney = build('rtpAnalysis', 'quickMoney')
    expect(quickMoney.blocks[0].type).toBe('note')
    expect(firstTable(quickMoney, 'betTypes').rows.every((r) => cellOf(r.cells.theoretical).value === null)).toBe(true)
    expect(firstTable(quickMoney, 'manual').rows).toHaveLength(7)
  })

  it('adds the financial report up by machine and lists unpaid prizes', () => {
    const doc = build('financialReport', 'all')
    const byBanca = firstTable(doc, 'byBanca')
    // 4 máquinas con movimiento × 2 juegos: venta 1000/1100/1200/1300 cada una por juego.
    expect(numberAt(byBanca, 0, 'sales', true)).toBe(2 * (1000 + 1100 + 1200 + 1300))
    expect(numberAt(byBanca, 0, 'paid', true)).toBe(8 * 800)
    expect(firstTable(doc, 'pending').rows).toHaveLength(2)
    expect(firstTable(build('financialReport', 'quickMoney'), 'pending').rows).toHaveLength(1)
  })

  it('lists active machines without sales as idle', () => {
    const idle = firstTable(build('salesActivity', 'all'), 'idle')
    expect(idle.rows.map((r) => cellOf(r.cells.machine).value)).toEqual(['NA-02'])
  })
})

describe('report aggregates', () => {
  const period = presetPeriod('last7Days', NOW)

  it('adds up the same totals by day, by game and by machine', () => {
    const activity = fixtureActivity(period)
    const total = totalsFor(activity, 'all')
    expect(totalsByDay(activity, period, 'all').reduce((s, d) => s + d.totals.sales, 0)).toBeCloseTo(total.sales, 6)
    expect(totalsByGame(activity).reduce((s, g) => s + g.totals.sales, 0)).toBeCloseTo(total.sales, 6)
    const machines = machineActivity(fixtureMachines(), 'roulette')
    expect(machines.reduce((s, m) => s + m.sales, 0)).toBe(1000 + 1100 + 1200 + 1300)
  })

  it('fills the days without rounds with zeros', () => {
    const days = totalsByDay({ days: [], hours: [] }, period, 'all')
    expect(days).toHaveLength(7)
    expect(days.every((d) => d.totals.rounds === 0 && d.totals.sales === 0)).toBe(true)
  })
})

describe('archivos con "Todos los juegos" (byGame)', () => {
  const files = (type: ReportType, game: ReportGameFilter, period: ReportPeriod = presetPeriod('last7Days', NOW)) =>
    buildReportDocument({ ...request(type, game, period, true), generatedBy: '', generatedAt: '' }, i18n.getFixedT('es'), 'es')

  it('adds the full report of every game in its own section after the combined one', () => {
    for (const type of TYPES) {
      const doc = files(type, 'all')
      expect(doc.blocks.filter((b) => b.type === 'section').map((b) => b.type === 'section' && b.key)).toEqual(['all', 'roulette', 'quickMoney'])
      const keys = documentPanels(doc).map((p) => p.key)
      expect(new Set(keys).size).toBe(keys.length)
      // Cada sección trae los mismos paneles que el reporte de ese juego solo.
      const single = documentPanels(build(type, 'quickMoney')).map((p) => `quickMoney.${p.key}`)
      expect(keys.filter((k) => k.startsWith('quickMoney.'))).toEqual(single)
    }
  })

  it('leaves single-game files and the screen document unchanged', () => {
    expect(files('gameReport', 'roulette').blocks.some((b) => b.type === 'section')).toBe(false)
    expect(build('gameReport', 'all').blocks.some((b) => b.type === 'section')).toBe(false)
  })

  it('names the Excel sheets of each section after its game', async () => {
    // Un día y sin gráficas (necesitan canvas para pintarse): acá solo importan los nombres de las hojas.
    const doc = files('gameReport', 'all', presetPeriod('yesterday', NOW))
    const tablesOnly = (p: DocPanel): DocPanel => ({ ...p, content: p.content.filter((c) => c.type === 'table') })
    doc.blocks = doc.blocks.map((b) => (b.type === 'panel' ? tablesOnly(b) : b.type === 'row' ? { ...b, panels: b.panels.map(tablesOnly) } : b))
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await (await buildExcel(doc, {})).arrayBuffer())
    const names = workbook.worksheets.map((s) => s.name)
    expect(names[0]).toBe('Resumen')
    expect(names).toContain('Todos · Por juego')
    expect(names.some((n) => n.startsWith('Ruleta · '))).toBe(true)
    expect(names.some((n) => n.startsWith('Quick Money · '))).toBe(true)
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
