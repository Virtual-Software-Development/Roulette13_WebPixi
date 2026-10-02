import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameEventsOverTimePoint } from '../../types/adminDashboard'
import './gameEventsOverTimeChart.css'

// Barras apiladas en SVG plano, mismo criterio que GamesActivityChart.tsx (el proyecto no tiene
// librería de charts). Totales y porcentajes de las chips se derivan de la serie, no se hardcodean.
const CHART_WIDTH = 1000
const CHART_HEIGHT = 340
const MARGIN = { top: 12, right: 12, bottom: 34, left: 54 }
const BAR_GAP_RATIO = 0.28

const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom
const BASELINE_Y = MARGIN.top + PLOT_HEIGHT

type EventStatusKey = 'completed' | 'failed' | 'cancelled'

interface StatusSeries {
  key: EventStatusKey
  labelKey: string
  color: string
}

// Orden de apilado de abajo hacia arriba (completed en la base, igual que la referencia).
const STATUSES: StatusSeries[] = [
  { key: 'completed', labelKey: 'admin.dashboard.gameEventsOverTime.completed', color: 'var(--admin-green)' },
  { key: 'failed', labelKey: 'admin.dashboard.gameEventsOverTime.failed', color: 'var(--admin-red)' },
  { key: 'cancelled', labelKey: 'admin.dashboard.gameEventsOverTime.cancelled', color: 'var(--admin-yellow)' },
]

// Solo estado visual por ahora -- el mock cubre únicamente 24H (mismo criterio que el dropdown de
// rango de GamesActivityChart, que tampoco refetchea).
const RANGE_OPTIONS = ['24H', '7D', '30D', '90D'] as const

function totalOf(point: GameEventsOverTimePoint): number {
  return point.completed + point.failed + point.cancelled
}

// Escala "redonda" hacia arriba en pasos de 100 (o múltiplos) para no pasar de ~8 gridlines.
function niceScale(maxValue: number): { yMax: number; ticks: number[] } {
  const step = 100 * Math.max(1, Math.ceil(maxValue / 800))
  const yMax = Math.max(step, Math.ceil(maxValue / step) * step)
  const ticks: number[] = []
  for (let v = 0; v <= yMax; v += step) ticks.push(v)
  return { yMax, ticks }
}

function formatHourRange(time: string): string {
  const [hour] = time.split(':')
  return `${time} – ${hour}:59`
}

export function GameEventsOverTimeChart({ series }: { series: GameEventsOverTimePoint[] }) {
  const { t, i18n } = useTranslation()
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]>('24H')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const count = series.length
  const { yMax, ticks } = niceScale(Math.max(0, ...series.map(totalOf)))
  const slotWidth = PLOT_WIDTH / Math.max(count, 1)
  const barWidth = slotWidth * (1 - BAR_GAP_RATIO)

  const yFor = (value: number) => MARGIN.top + PLOT_HEIGHT - (value / yMax) * PLOT_HEIGHT
  const slotX = (index: number) => MARGIN.left + index * slotWidth
  const numberFormat = new Intl.NumberFormat(i18n.language)

  const totals = STATUSES.map((s) => ({ ...s, value: series.reduce((sum, point) => sum + point[s.key], 0) }))
  const grandTotal = totals.reduce((sum, s) => sum + s.value, 0)

  const hovered = hoveredIndex !== null ? series[hoveredIndex] : null
  const hoveredCenterPercent = hoveredIndex !== null ? ((slotX(hoveredIndex) + slotWidth / 2) / CHART_WIDTH) * 100 : 0

  return (
    <section className="admin-panel admin-game-events-chart">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">{t('admin.dashboard.gameEventsOverTime.title')}</h2>
          <p className="admin-game-events-chart-subtitle">{t('admin.dashboard.gameEventsOverTime.subtitle')}</p>
        </div>
        <div className="admin-game-events-chart-ranges" role="group">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className="admin-game-events-chart-range"
              data-selected={option === range}
              aria-pressed={option === range}
              onClick={() => setRange(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-game-events-chart-summary">
        {totals.map((s) => (
          <div key={s.key} className="admin-game-events-chart-stat">
            <span className="admin-game-events-chart-stat-label">
              <span className="admin-game-events-chart-dot" style={{ background: s.color }} />
              {t(s.labelKey)}
            </span>
            <span className="admin-game-events-chart-stat-values">
              <span className="admin-game-events-chart-stat-value">{numberFormat.format(s.value)}</span>
              <span className="admin-game-events-chart-stat-percent" style={{ color: s.color }}>
                {grandTotal > 0 ? ((s.value / grandTotal) * 100).toFixed(1) : '0.0'}%
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="admin-game-events-chart-plot" onMouseLeave={() => setHoveredIndex(null)}>
        <svg
          className="admin-game-events-chart-svg"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={t('admin.dashboard.gameEventsOverTime.title')}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={CHART_WIDTH - MARGIN.right}
                y1={yFor(tick)}
                y2={yFor(tick)}
                className="admin-game-events-chart-gridline"
              />
              <text x={MARGIN.left - 14} y={yFor(tick)} className="admin-game-events-chart-axis-label" textAnchor="end" dominantBaseline="middle">
                {tick}
              </text>
            </g>
          ))}

          {series.map((point, i) => {
            const x = slotX(i) + (slotWidth - barWidth) / 2
            let stackBase = 0
            return (
              <g
                key={point.time}
                className="admin-game-events-chart-bar"
                data-dimmed={hoveredIndex !== null && hoveredIndex !== i}
                onMouseEnter={() => setHoveredIndex(i)}
              >
                {/* Hit area de alto completo -- el hover no depende de apuntar justo al segmento. */}
                <rect x={slotX(i)} y={MARGIN.top} width={slotWidth} height={PLOT_HEIGHT} fill="transparent" />
                {STATUSES.map((s) => {
                  const value = point[s.key]
                  const y = yFor(stackBase + value)
                  const height = yFor(stackBase) - y
                  stackBase += value
                  return <rect key={s.key} x={x} y={y} width={barWidth} height={Math.max(height, 0)} fill={s.color} />
                })}
              </g>
            )
          })}

          {/* Una etiqueta cada 2 horas para que no se encimen. */}
          {series.map((point, i) =>
            i % 2 === 0 ? (
              <text key={point.time} x={slotX(i) + slotWidth / 2} y={CHART_HEIGHT - 8} className="admin-game-events-chart-axis-label" textAnchor="middle">
                {point.time}
              </text>
            ) : null,
          )}

          <line x1={MARGIN.left} x2={CHART_WIDTH - MARGIN.right} y1={BASELINE_Y} y2={BASELINE_Y} className="admin-game-events-chart-baseline" />
        </svg>

        {hovered && (
          <div
            className="admin-game-events-chart-tooltip"
            data-align={hoveredCenterPercent > 70 ? 'right' : 'left'}
            style={{ left: `${hoveredCenterPercent}%` }}
          >
            <div className="admin-game-events-chart-tooltip-title">{formatHourRange(hovered.time)}</div>
            {STATUSES.map((s) => (
              <div key={s.key} className="admin-game-events-chart-tooltip-row">
                <span className="admin-game-events-chart-dot" style={{ background: s.color }} />
                <span>{t(s.labelKey)}</span>
                <span className="admin-game-events-chart-tooltip-value">{numberFormat.format(hovered[s.key])}</span>
              </div>
            ))}
            <div className="admin-game-events-chart-tooltip-row admin-game-events-chart-tooltip-total">
              <span>{t('admin.dashboard.gameEventsOverTime.total')}</span>
              <span className="admin-game-events-chart-tooltip-value">{numberFormat.format(totalOf(hovered))}</span>
            </div>
          </div>
        )}
      </div>

      <div className="admin-game-events-chart-legend">
        {STATUSES.map((s) => (
          <span key={s.key} className="admin-game-events-chart-legend-item">
            <span className="admin-game-events-chart-dot" style={{ background: s.color }} />
            {t(s.labelKey)}
          </span>
        ))}
      </div>
    </section>
  )
}
