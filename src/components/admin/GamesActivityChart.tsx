import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClickOutside } from '../../hooks/useClickOutside'
import type { GamesActivitySeriesPoint } from '../../types/adminDashboard'
import './gamesActivityChart.css'

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="admin-games-activity-range-chevron" aria-hidden="true" focusable="false">
      <path d="M5 8.5 12 15.5 19 8.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// El proyecto no tiene ninguna librería de charts instalada (Recharts/Chart.js/ECharts/etc. --
// verificado, ver investigación previa) y todas las visualizaciones de "stats" existentes son
// shapes de Pixi Graphics, no reutilizables desde DOM. En vez de sumar una dependencia nueva para
// un solo gráfico de líneas, se dibuja a mano con SVG plano (mismo criterio que los íconos inline
// de LoginPage cuando no existe un asset -- resolver con lo mínimo necesario).
const CHART_WIDTH = 1000
const CHART_HEIGHT = 320
const MARGIN = { top: 12, right: 12, bottom: 30, left: 54 }
const Y_MAX = 200
const Y_TICKS = [0, 50, 100, 150, 200]
const X_LABELS = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']

const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom
const BASELINE_Y = MARGIN.top + PLOT_HEIGHT

function yFor(value: number): number {
  return MARGIN.top + PLOT_HEIGHT - (Math.min(value, Y_MAX) / Y_MAX) * PLOT_HEIGHT
}

function xFor(index: number, count: number): number {
  return MARGIN.left + (index / (count - 1)) * PLOT_WIDTH
}

interface Series {
  key: 'roulette' | 'pick3' | 'pick4'
  labelKey: string
  color: string
  gradientId: string
}

const SERIES: Series[] = [
  { key: 'roulette', labelKey: 'admin.dashboard.gamesActivity.roulette', color: 'var(--admin-red)', gradientId: 'admin-activity-roulette' },
  { key: 'pick3', labelKey: 'admin.dashboard.gamesActivity.pick3', color: 'var(--admin-blue)', gradientId: 'admin-activity-pick3' },
  { key: 'pick4', labelKey: 'admin.dashboard.gamesActivity.pick4', color: 'var(--admin-purple)', gradientId: 'admin-activity-pick4' },
]

const RANGE_OPTIONS = ['last24Hours', 'last7Days', 'last30Days'] as const

export function GamesActivityChart({ series }: { series: GamesActivitySeriesPoint[] }) {
  const { t } = useTranslation()
  const count = series.length
  const [isOpen, setIsOpen] = useState(false)
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]>('last24Hours')
  const containerRef = useRef<HTMLDivElement>(null)

  useClickOutside(containerRef, () => setIsOpen(false))

  return (
    <section className="admin-panel admin-games-activity">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">{t('admin.dashboard.gamesActivity.title')}</h2>
        <div className="admin-dropdown" ref={containerRef}>
          <button type="button" className="admin-games-activity-range" aria-expanded={isOpen} onClick={() => setIsOpen((value) => !value)}>
            {t(`admin.dashboard.activityRangeOptions.${range}`)}
            <span className={`admin-games-activity-range-chevron-wrap${isOpen ? ' admin-games-activity-range-chevron-wrap--open' : ''}`}>
              <ChevronDownIcon />
            </span>
          </button>

          {isOpen && (
            <div className="admin-dropdown-menu" role="listbox">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="admin-dropdown-option"
                  data-selected={option === range}
                  role="option"
                  aria-selected={option === range}
                  onClick={() => {
                    setRange(option)
                    setIsOpen(false)
                  }}
                >
                  {t(`admin.dashboard.activityRangeOptions.${option}`)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <svg
        className="admin-games-activity-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={t('admin.dashboard.gamesActivity.title')}
      >
        <defs>
          {SERIES.map((s) => (
            <linearGradient key={s.gradientId} id={s.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.16" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {Y_TICKS.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={CHART_WIDTH - MARGIN.right}
              y1={yFor(tick)}
              y2={yFor(tick)}
              className="admin-games-activity-gridline"
            />
            <text x={MARGIN.left - 14} y={yFor(tick)} className="admin-games-activity-axis-label" textAnchor="end" dominantBaseline="middle">
              {tick}
            </text>
          </g>
        ))}

        {X_LABELS.map((label, i) => {
          const x = MARGIN.left + (i / (X_LABELS.length - 1)) * PLOT_WIDTH
          // Los extremos anclan hacia adentro (start/end en vez de middle) para no desbordar el
          // viewBox -- a mitad de escala "middle" ya es correcto, solo los bordes lo necesitan.
          const textAnchor = i === 0 ? 'start' : i === X_LABELS.length - 1 ? 'end' : 'middle'
          return (
            <text key={label} x={x} y={CHART_HEIGHT - 8} className="admin-games-activity-axis-label" textAnchor={textAnchor}>
              {label}
            </text>
          )
        })}

        {SERIES.map((s) => {
          const points = series.map((point, i) => `${xFor(i, count)},${yFor(point[s.key])}`).join(' ')
          const areaPath = `M ${xFor(0, count)},${BASELINE_Y} L ${points} L ${xFor(count - 1, count)},${BASELINE_Y} Z`
          return (
            <g key={s.key}>
              <path d={areaPath} fill={`url(#${s.gradientId})`} stroke="none" />
              <polyline
                points={points}
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                className="admin-games-activity-line"
                style={{ filter: `drop-shadow(0 0 4px color-mix(in srgb, ${s.color} 45%, transparent))` }}
              />
            </g>
          )
        })}
      </svg>

      <div className="admin-games-activity-legend">
        {SERIES.map((s) => (
          <span key={s.key} className="admin-games-activity-legend-item">
            <span className="admin-games-activity-legend-dot" style={{ background: s.color }} />
            {t(s.labelKey)}
          </span>
        ))}
      </div>
    </section>
  )
}
