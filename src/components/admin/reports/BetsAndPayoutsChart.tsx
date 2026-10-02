import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BetsPayoutsPoint } from '../../../types/adminReports'
import './betsAndPayoutsChart.css'

// Barra apilada por día: payouts abajo + GGR arriba, así la altura total ES el total apostado
// (bets = payouts + GGR) y la ganancia de la casa se lee directo en vez de restar mentalmente dos
// barras lado a lado (diseño anterior). SVG a mano, mismo criterio que el resto de charts del Admin.
// Colores validados con el validador de paleta de dataviz contra el fondo oscuro (#0b1620): azul +
// ámbar pasan separación para daltonismo; el azul/morado de las KPI cards no (ΔE deutan 2.7).
// El SVG se dibuja al tamaño real (en px) de su contenedor, medido con ResizeObserver, en vez de un
// viewBox fijo estirado: así el chart crece en alto para llenar la columna (la columna derecha,
// RTP Trend + Peak Hours, es más alta) sin deformar el texto ni dejar espacio vacío debajo.
const FALLBACK_SIZE = { width: 900, height: 300 }
const MARGIN = { top: 26, right: 8, bottom: 28, left: 56 }
const MAX_BAR_WIDTH = 64
const BAR_WIDTH_RATIO = 0.42
const SEGMENT_GAP = 2
const CORNER_RADIUS = 4
// Por debajo de este ancho de slot (px) no entran las etiquetas de total sobre cada barra (ej. 30
// días) -- quedan solo en el tooltip.
const MIN_SLOT_FOR_LABELS = 56

const PAYOUT_COLOR = '#2588ff'
const GGR_COLOR = '#c98420'

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function formatCompactUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${Math.round(value)}`
}

function niceScale(maxValue: number): { yMax: number; ticks: number[] } {
  const rough = Math.max(maxValue, 1) / 4
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude
  const yMax = Math.ceil(maxValue / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= yMax + step / 2; v += step) ticks.push(v)
  return { yMax, ticks }
}

// Rect con solo las esquinas superiores redondeadas (extremo de dato), base recta sobre el eje.
function topRoundedRect(x: number, y: number, width: number, height: number, r: number): string {
  const radius = Math.min(r, width / 2, height)
  return `M${x},${y + height} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + width - radius} Q${x + width},${y} ${x + width},${y + radius} V${y + height} Z`
}

const pct = (value: number) => `${value.toFixed(1)}%`

export function BetsAndPayoutsChart({ series }: { series: BetsPayoutsPoint[] }) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState<number | null>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(FALLBACK_SIZE)

  useLayoutEffect(() => {
    const el = plotRef.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width > 0 && height > 0) setSize({ width: Math.round(width), height: Math.round(height) })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const CHART_WIDTH = size.width
  const CHART_HEIGHT = size.height
  const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right
  const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom
  const BASELINE_Y = MARGIN.top + PLOT_HEIGHT

  const totals = series.reduce((acc, p) => ({ bets: acc.bets + p.bets, payout: acc.payout + p.payout }), { bets: 0, payout: 0 })
  const totalGgr = totals.bets - totals.payout
  const holdPct = totals.bets > 0 ? (totalGgr / totals.bets) * 100 : 0

  const { yMax, ticks } = niceScale(Math.max(0, ...series.map((p) => p.bets)) * 1.08)
  const yFor = (value: number) => MARGIN.top + PLOT_HEIGHT - (value / yMax) * PLOT_HEIGHT
  const slotWidth = PLOT_WIDTH / Math.max(series.length, 1)
  const barWidth = Math.min(MAX_BAR_WIDTH, slotWidth * BAR_WIDTH_RATIO)
  const showTotals = slotWidth >= MIN_SLOT_FOR_LABELS
  const slotCenter = (i: number) => MARGIN.left + slotWidth * i + slotWidth / 2

  const point = hovered !== null ? series[hovered] : null
  const tooltipLeftPct = hovered !== null ? (slotCenter(hovered) / CHART_WIDTH) * 100 : 0

  return (
    <section className="admin-panel admin-bets-payouts-chart">
      <div className="admin-panel-header admin-bets-payouts-header">
        <div>
          <h2 className="admin-panel-title">{t('admin.reports.betsAndPayouts.title')}</h2>
          <p className="admin-bets-payouts-subtitle">{t('admin.reports.betsAndPayouts.subtitle')}</p>
        </div>
        <div className="admin-bets-payouts-legend">
          <span className="admin-bets-payouts-legend-item">
            <span className="admin-bets-payouts-swatch" style={{ background: PAYOUT_COLOR }} />
            {t('admin.reports.betsAndPayouts.payout')}
          </span>
          <span className="admin-bets-payouts-legend-item">
            <span className="admin-bets-payouts-swatch" style={{ background: GGR_COLOR }} />
            {t('admin.reports.betsAndPayouts.ggr')}
          </span>
        </div>
      </div>

      <div className="admin-bets-payouts-stats">
        <div className="admin-bets-payouts-stat">
          <span className="admin-bets-payouts-stat-label">{t('admin.reports.betsAndPayouts.bets')}</span>
          <span className="admin-bets-payouts-stat-value">{USD.format(totals.bets)}</span>
        </div>
        <div className="admin-bets-payouts-stat">
          <span className="admin-bets-payouts-stat-label">
            <span className="admin-bets-payouts-swatch" style={{ background: PAYOUT_COLOR }} />
            {t('admin.reports.betsAndPayouts.payout')}
          </span>
          <span className="admin-bets-payouts-stat-value">{USD.format(totals.payout)}</span>
        </div>
        <div className="admin-bets-payouts-stat">
          <span className="admin-bets-payouts-stat-label">
            <span className="admin-bets-payouts-swatch" style={{ background: GGR_COLOR }} />
            {t('admin.reports.betsAndPayouts.ggr')}
          </span>
          <span className="admin-bets-payouts-stat-value">{USD.format(totalGgr)}</span>
        </div>
        <div className="admin-bets-payouts-stat">
          <span className="admin-bets-payouts-stat-label">{t('admin.reports.betsAndPayouts.hold')}</span>
          <span className="admin-bets-payouts-stat-value">{pct(holdPct)}</span>
        </div>
      </div>

      <div className="admin-bets-payouts-plot" ref={plotRef} onMouseLeave={() => setHovered(null)}>
        <svg
          className="admin-bets-payouts-svg"
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label={t('admin.reports.betsAndPayouts.title')}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={CHART_WIDTH - MARGIN.right} y1={yFor(tick)} y2={yFor(tick)} className="admin-bets-payouts-gridline" />
              <text x={MARGIN.left - 10} y={yFor(tick)} className="admin-bets-payouts-axis-label" textAnchor="end" dominantBaseline="middle">
                {tick === 0 ? '$0' : formatCompactUsd(tick)}
              </text>
            </g>
          ))}

          {series.map((p, i) => {
            const ggr = Math.max(p.bets - p.payout, 0)
            const x = slotCenter(i) - barWidth / 2
            const payoutTop = yFor(p.payout)
            const ggrTop = yFor(p.bets)
            const ggrHeight = Math.max(payoutTop - ggrTop - SEGMENT_GAP, 0)
            return (
              <g
                key={p.label}
                className="admin-bets-payouts-group"
                data-dimmed={hovered !== null && hovered !== i}
                onMouseEnter={() => setHovered(i)}
              >
                {/* Hit area del alto completo del slot -- el hover no exige apuntar a la barra. */}
                <rect x={MARGIN.left + slotWidth * i} y={MARGIN.top} width={slotWidth} height={PLOT_HEIGHT} fill="transparent" />
                <rect x={x} y={payoutTop} width={barWidth} height={BASELINE_Y - payoutTop} fill={PAYOUT_COLOR} />
                {ggr > 0 && <path d={topRoundedRect(x, ggrTop, barWidth, ggrHeight, CORNER_RADIUS)} fill={GGR_COLOR} />}
                {showTotals && (
                  <text x={slotCenter(i)} y={ggrTop - 7} className="admin-bets-payouts-total-label" textAnchor="middle">
                    {formatCompactUsd(p.bets)}
                  </text>
                )}
                <text x={slotCenter(i)} y={CHART_HEIGHT - 7} className="admin-bets-payouts-axis-label" textAnchor="middle">
                  {p.label}
                </text>
              </g>
            )
          })}

          <line x1={MARGIN.left} x2={CHART_WIDTH - MARGIN.right} y1={BASELINE_Y} y2={BASELINE_Y} className="admin-bets-payouts-baseline" />
        </svg>

        {point && (
          <div className="admin-bets-payouts-tooltip" data-align={tooltipLeftPct > 70 ? 'right' : 'left'} style={{ left: `${tooltipLeftPct}%` }}>
            <div className="admin-bets-payouts-tooltip-title">{point.label}</div>
            <div className="admin-bets-payouts-tooltip-row">
              <span>{t('admin.reports.betsAndPayouts.bets')}</span>
              <span className="admin-bets-payouts-tooltip-value">{USD.format(point.bets)}</span>
            </div>
            <div className="admin-bets-payouts-tooltip-row">
              <span className="admin-bets-payouts-swatch" style={{ background: PAYOUT_COLOR }} />
              <span>{t('admin.reports.betsAndPayouts.payout')}</span>
              <span className="admin-bets-payouts-tooltip-value">{USD.format(point.payout)}</span>
            </div>
            <div className="admin-bets-payouts-tooltip-row">
              <span className="admin-bets-payouts-swatch" style={{ background: GGR_COLOR }} />
              <span>{t('admin.reports.betsAndPayouts.ggr')}</span>
              <span className="admin-bets-payouts-tooltip-value">{USD.format(point.bets - point.payout)}</span>
            </div>
            <div className="admin-bets-payouts-tooltip-row admin-bets-payouts-tooltip-footer">
              <span>{t('admin.reports.betsAndPayouts.rtp')}</span>
              <span className="admin-bets-payouts-tooltip-value">{pct(point.bets > 0 ? (point.payout / point.bets) * 100 : 0)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Vista de tabla para lectores de pantalla -- mismos datos que el gráfico. */}
      <table className="admin-bets-payouts-sr-table">
        <caption>{t('admin.reports.betsAndPayouts.title')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('admin.reports.betsAndPayouts.date')}</th>
            <th scope="col">{t('admin.reports.betsAndPayouts.bets')}</th>
            <th scope="col">{t('admin.reports.betsAndPayouts.payout')}</th>
            <th scope="col">{t('admin.reports.betsAndPayouts.ggr')}</th>
          </tr>
        </thead>
        <tbody>
          {series.map((p) => (
            <tr key={p.label}>
              <th scope="row">{p.label}</th>
              <td>{USD.format(p.bets)}</td>
              <td>{USD.format(p.payout)}</td>
              <td>{USD.format(p.bets - p.payout)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
