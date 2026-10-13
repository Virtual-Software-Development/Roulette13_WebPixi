// Formatos de Reports (docs: "Definiciones comunes"): montos en la moneda de Reportes (ver
// setReportCurrency), RTP con dos decimales, fechas dd/mm/aaaa, zona horaria America/Santo_Domingo.
//
// Convención de fechas: todas las Date de Reports representan la hora de pared de Santo Domingo
// guardada en los campos locales del Date (getFullYear/getHours/...). reportNow() arma ese Date a
// partir del reloj real, así el formateo usa los getters locales sin volver a convertir de zona.

export const REPORT_TIME_ZONE = 'America/Santo_Domingo'

const TZ_PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: REPORT_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  hourCycle: 'h23',
})

export function reportNow(real: Date = new Date()): Date {
  const parts = Object.fromEntries(TZ_PARTS_FORMATTER.formatToParts(real).map((p) => [p.type, p.value]))
  return new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second))
}

const pad = (n: number) => String(n).padStart(2, '0')

const COUNT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

// Moneda de los montos de Reportes, como código ISO 4217 (DOP, USD…). Va a venir de la base de
// datos (todavía no hay endpoint): hasta entonces, DOP. Símbolo y decimales salen del código: el
// símbolo dominicano si lo tiene (DOP -> "RD$", USD -> "US$"), si no el de en-US (EUR -> "€").
// Los archivos se arman en un worker con su propia copia de este módulo: el documento lleva el
// código (ReportDocument.currency) y el worker lo aplica antes de armar el archivo.
const DEFAULT_REPORT_CURRENCY = 'DOP'

interface ReportCurrency {
  code: string
  symbol: string
  amount: Intl.NumberFormat
}

function currencySymbol(code: string): string {
  const symbolIn = (locale: string, display: 'symbol' | 'narrowSymbol') =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: code, currencyDisplay: display }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? code
  return [symbolIn('es-DO', 'symbol'), symbolIn('en-US', 'symbol'), symbolIn('en-US', 'narrowSymbol')].find((s) => s !== code) ?? code
}

function makeCurrency(code: string): ReportCurrency {
  const digits = new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits ?? 2
  return { code, symbol: currencySymbol(code), amount: new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }) }
}

let currency = makeCurrency(DEFAULT_REPORT_CURRENCY)

// Cambia la moneda de Reportes (código ISO 4217). Un código inválido lanza RangeError.
export function setReportCurrency(code: string) {
  if (code !== currency.code) currency = makeCurrency(code)
}

export const reportCurrencyCode = () => currency.code
export const reportCurrencySymbol = () => currency.symbol
// Decimales de la moneda (2 en DOP/USD, 0 en JPY): formato de celda del Excel.
export const reportCurrencyDigits = () => currency.amount.resolvedOptions().maximumFractionDigits ?? 2

export function formatCurrency(value: number): string {
  const text = `${currency.symbol} ${currency.amount.format(Math.abs(value))}`
  return value < 0 ? `-${text}` : text
}

// Montos grandes sin decimales (tarjetas y tooltips de las gráficas): RD$ 1,530,928.
export function formatRoundedCurrency(value: number): string {
  const text = `${currency.symbol} ${COUNT.format(Math.abs(value))}`
  return value < 0 ? `-${text}` : text
}

// Ejes de gráficas: RD$ 1.2M / RD$ 350K.
export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${currency.symbol} ${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`
  if (abs >= 1_000) return `${sign}${currency.symbol} ${Math.round(abs / 1_000)}K`
  return `${sign}${currency.symbol} ${Math.round(abs)}`
}

export const formatCount = (value: number) => COUNT.format(value)

export function formatPercent(value: number | null, digits = 2): string {
  return value === null || !Number.isFinite(value) ? '—' : `${value.toFixed(digits)}%`
}

// Diferencia en puntos porcentuales, con signo.
export function formatPoints(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toFixed(digits)} pp`
}

// Variación % = (actual − anterior) ÷ anterior × 100; "—" si el anterior es 0.
export function variationPercent(current: number, previous: number): number | null {
  return previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100
}

export function formatVariation(current: number, previous: number): string {
  const change = variationPercent(current, previous)
  if (change === null) return '—'
  const sign = change > 0 ? '+' : change < 0 ? '−' : ''
  return `${sign}${Math.abs(change).toFixed(1)}%`
}

export const formatDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
export const formatDayMonth = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
export const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
export const formatDateTime = (d: Date) => `${formatDate(d)} ${formatTime(d)}`
