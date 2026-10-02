import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClickOutside } from '../../hooks/useClickOutside'
import type { GamePerformanceRow } from '../../types/adminDashboard'
import './gamePerformanceChart.css'

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="admin-game-performance-mode-chevron" aria-hidden="true" focusable="false">
      <path d="M5 8.5 12 15.5 19 8.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Barras agrupadas en SVG plano, mismo criterio que GamesActivityChart/GameEventsOverTimeChart (el
// proyecto no tiene librería de charts). Colores = accents de las KPI de arriba (Total Bets verde,
// Total Payout azul, Gross Revenue morado) para que card y barra se lean como la misma métrica.
const CHART_WIDTH = 1000
const CHART_HEIGHT = 340
const MARGIN = { top: 34, right: 12, bottom: 38, left: 84 }
const GROUP_GAP_RATIO = 0.3
const BAR_GAP = 8

const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom
const BASELINE_Y = MARGIN.top + PLOT_HEIGHT

type MetricKey = 'wagers' | 'payouts' | 'ggr'

interface Metric {
  key: MetricKey
  labelKey: string
  color: string
}

const METRICS: Metric[] = [
  { key: 'wagers', labelKey: 'admin.dashboard.gamePerformance.totalWagers', color: 'var(--admin-green)' },
  { key: 'payouts', labelKey: 'admin.dashboard.gamePerformance.totalPayouts', color: 'var(--admin-blue)' },
  { key: 'ggr', labelKey: 'admin.dashboard.gamePerformance.ggr', color: 'var(--admin-purple)' },
]

// amount = USD absolutos; share = % que aporta cada juego al total de esa métrica.
const MODE_OPTIONS = ['amount', 'share'] as const
type Mode = (typeof MODE_OPTIONS)[number]

function formatCompactUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${Math.round(value)}`
}

function formatValue(value: number, mode: Mode): string {
  return mode === 'share' ? `${value.toFixed(1)}%` : formatCompactUsd(value)
}

// Escala "redonda" hacia arriba con 4-6 gridlines (1/2/5 × 10^n).
function niceScale(maxValue: number): { yMax: number; ticks: number[] } {
  if (maxValue <= 0) return { yMax: 1, ticks: [0, 1] }
  const rough = maxValue / 5
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude
  const yMax = Math.ceil(maxValue / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= yMax + step / 2; v += step) ticks.push(v)
  return { yMax, ticks }
}

export function GamePerformanceChart({ rows }: { rows: GamePerformanceRow[] }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('amount')
  const containerRef = useRef<HTMLDivElement>(null)

  useClickOutside(containerRef, () => setIsOpen(false))

  const totals: Record<MetricKey, number> = {
    wagers: rows.reduce((sum, row) => sum + row.wagers, 0),
    payouts: rows.reduce((sum, row) => sum + row.payouts, 0),
    ggr: rows.reduce((sum, row) => sum + row.ggr, 0),
  }
  const valueOf = (row: GamePerformanceRow, key: MetricKey) =>
    mode === 'share' ? (totals[key] > 0 ? (row[key] / totals[key]) * 100 : 0) : row[key]

  const { yMax, ticks } = niceScale(Math.max(0, ...rows.flatMap((row) => METRICS.map((m) => valueOf(row, m.key)))))
  const yFor = (value: number) => MARGIN.top + PLOT_HEIGHT - (value / yMax) * PLOT_HEIGHT

  const groupWidth = PLOT_WIDTH / Math.max(rows.length, 1)
  const innerWidth = groupWidth * (1 - GROUP_GAP_RATIO)
  const barWidth = (innerWidth - BAR_GAP * (METRICS.length - 1)) / METRICS.length

  return (
    <section className="admin-panel admin-game-performance">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">{t('admin.dashboard.gamePerformance.title')}</h2>
          <p className="admin-game-performance-subtitle">{t('admin.dashboard.gamePerformance.subtitle')}</p>
        </div>
        <div className="admin-dropdown" ref={containerRef}>
          <button type="button" className="admin-game-performance-mode" aria-expanded={isOpen} onClick={() => setIsOpen((value) => !value)}>
            {t(`admin.dashboard.gamePerformance.modes.${mode}`)}
            <span className={`admin-game-performance-mode-chevron-wrap${isOpen ? ' admin-game-performance-mode-chevron-wrap--open' : ''}`}>
              <ChevronDownIcon />
            </span>
          </button>

          {isOpen && (
            <div className="admin-dropdown-menu" role="listbox">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="admin-dropdown-option"
                  data-selected={option === mode}
                  role="option"
                  aria-selected={option === mode}
                  onClick={() => {
                    setMode(option)
                    setIsOpen(false)
                  }}
                >
                  {t(`admin.dashboard.gamePerformance.modes.${option}`)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <svg
        className="admin-game-performance-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={t('admin.dashboard.gamePerformance.title')}
      >
        <text
          x={18}
          y={MARGIN.top + PLOT_HEIGHT / 2}
          className="admin-game-performance-axis-title"
          textAnchor="middle"
          transform={`rotate(-90 18 ${MARGIN.top + PLOT_HEIGHT / 2})`}
        >
          {t(`admin.dashboard.gamePerformance.yAxis.${mode}`)}
        </text>

        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={MARGIN.left} x2={CHART_WIDTH - MARGIN.right} y1={yFor(tick)} y2={yFor(tick)} className="admin-game-performance-gridline" />
            <text x={MARGIN.left - 12} y={yFor(tick)} className="admin-game-performance-axis-label" textAnchor="end" dominantBaseline="middle">
              {/* Eje sin "$" (el título ya dice USD), igual que la referencia: 0, 250K, 500K... */}
              {mode === 'share' ? `${tick}%` : formatCompactUsd(tick).slice(1)}
            </text>
          </g>
        ))}

        {rows.map((row, groupIndex) => {
          const groupX = MARGIN.left + groupIndex * groupWidth + (groupWidth - innerWidth) / 2
          return (
            <g key={row.id}>
              {METRICS.map((metric, metricIndex) => {
                const value = valueOf(row, metric.key)
                const x = groupX + metricIndex * (barWidth + BAR_GAP)
                const y = yFor(value)
                return (
                  <g key={metric.key}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(BASELINE_Y - y, 0)}
                      rx={4}
                      fill={metric.color}
                      className="admin-game-performance-bar"
                    >
                      <title>{`${t(row.labelKey)} · ${t(metric.labelKey)}: ${formatValue(value, mode)}`}</title>
                    </rect>
                    <text x={x + barWidth / 2} y={y - 8} className="admin-game-performance-value-label" textAnchor="middle">
                      {formatValue(value, mode)}
                    </text>
                  </g>
                )
              })}
              <text x={MARGIN.left + groupIndex * groupWidth + groupWidth / 2} y={CHART_HEIGHT - 10} className="admin-game-performance-group-label" textAnchor="middle">
                {t(row.labelKey)}
              </text>
            </g>
          )
        })}

        <line x1={MARGIN.left} x2={CHART_WIDTH - MARGIN.right} y1={BASELINE_Y} y2={BASELINE_Y} className="admin-game-performance-baseline" />
      </svg>

      <div className="admin-game-performance-legend">
        {METRICS.map((metric) => (
          <span key={metric.key} className="admin-game-performance-legend-item">
            <span className="admin-game-performance-legend-dot" style={{ background: metric.color }} />
            {t(metric.labelKey)}
          </span>
        ))}
      </div>
    </section>
  )
}
