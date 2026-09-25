import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClickOutside } from '../../hooks/useClickOutside'
import type { RtpHistoryPoint, RtpTrendRange } from '../../types/rtpDashboard'
import './rtpTrendChart.css'

// Mismo criterio que GamesActivityChart: el proyecto no tiene ninguna librería de charts
// instalada (ver investigación previa) -- se dibuja a mano con SVG plano en vez de sumar una
// dependencia nueva para un solo gráfico de líneas.
const CHART_WIDTH = 1000
const CHART_HEIGHT = 340
const MARGIN = { top: 12, right: 12, bottom: 30, left: 60 }
const Y_MIN = 40
const Y_MAX = 110
const Y_TICKS = [40, 50, 60, 70, 80, 90, 100, 110]
// Cantidad máxima de labels en el eje X -- el rango más largo (1 Month = 30 días) mostraría 30
// fechas superpuestas si se etiquetara cada punto; se eligen ~6 índices parejos en vez de eso,
// la línea sigue graficando TODOS los puntos igual.
const MAX_X_LABELS = 6

const RANGE_OPTIONS: RtpTrendRange[] = ['last7Days', 'twoWeeks', 'threeWeeks', 'oneMonth']

function rangeLabelKey(range: RtpTrendRange): string {
  return range === 'last7Days' ? 'admin.dashboard.activityRangeOptions.last7Days' : `admin.rtp.trendChart.rangeOptions.${range}`
}

const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom

function yFor(value: number): number {
  const clamped = Math.min(Math.max(value, Y_MIN), Y_MAX)
  return MARGIN.top + PLOT_HEIGHT - ((clamped - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_HEIGHT
}

function xFor(index: number, count: number): number {
  return MARGIN.left + (index / (count - 1)) * PLOT_WIDTH
}

function pickLabelIndices(count: number): number[] {
  if (count <= MAX_X_LABELS) return Array.from({ length: count }, (_, i) => i)
  const step = (count - 1) / (MAX_X_LABELS - 1)
  return Array.from(new Set(Array.from({ length: MAX_X_LABELS }, (_, i) => Math.round(i * step))))
}

interface LineSeries {
  key: keyof Omit<RtpHistoryPoint, 'date'>
  color: string
  dashed: boolean
  gameLabelKey: string
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="admin-rtp-trend-range-chevron" aria-hidden="true" focusable="false">
      <path d="M5 8.5 12 15.5 19 8.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ACTUAL = solid, TARGET = dashed -- la distinción no depende únicamente del color (pedido
// explícito), por eso strokeDasharray se aplica también en el swatch de la legend, no solo acá.
const SERIES: LineSeries[] = [
  { key: 'rouletteActual', color: 'var(--admin-red)', dashed: false, gameLabelKey: 'admin.dashboard.gamesActivity.roulette' },
  { key: 'rouletteTarget', color: 'var(--admin-red)', dashed: true, gameLabelKey: 'admin.dashboard.gamesActivity.roulette' },
  { key: 'pick3Actual', color: 'var(--admin-green)', dashed: false, gameLabelKey: 'admin.dashboard.gamesActivity.pick3' },
  { key: 'pick3Target', color: 'var(--admin-green)', dashed: true, gameLabelKey: 'admin.dashboard.gamesActivity.pick3' },
  { key: 'pick4Actual', color: 'var(--admin-amber)', dashed: false, gameLabelKey: 'admin.dashboard.gamesActivity.pick4' },
  { key: 'pick4Target', color: 'var(--admin-amber)', dashed: true, gameLabelKey: 'admin.dashboard.gamesActivity.pick4' },
]

interface RtpTrendChartProps {
  historyByRange: Record<RtpTrendRange, RtpHistoryPoint[]>
}

export function RtpTrendChart({ historyByRange }: RtpTrendChartProps) {
  const { t } = useTranslation()
  const [range, setRange] = useState<RtpTrendRange>('last7Days')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setIsOpen(false))

  const history = historyByRange[range]
  const count = history.length
  const labelIndices = pickLabelIndices(count)

  return (
    <section className="admin-panel admin-rtp-trend">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">{t('admin.rtp.trendChart.title')}</h2>
        <div className="admin-dropdown" ref={containerRef}>
          <button type="button" className="admin-rtp-trend-range" aria-expanded={isOpen} onClick={() => setIsOpen((value) => !value)}>
            {t(rangeLabelKey(range))}
            <span className={`admin-rtp-trend-range-chevron-wrap${isOpen ? ' admin-rtp-trend-range-chevron-wrap--open' : ''}`}>
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
                  {t(rangeLabelKey(option))}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <svg
        className="admin-rtp-trend-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={t('admin.rtp.trendChart.title')}
      >
        {Y_TICKS.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={CHART_WIDTH - MARGIN.right}
              y1={yFor(tick)}
              y2={yFor(tick)}
              className="admin-rtp-trend-gridline"
            />
            <text x={MARGIN.left - 14} y={yFor(tick)} className="admin-rtp-trend-axis-label" textAnchor="end" dominantBaseline="middle">
              {tick}%
            </text>
          </g>
        ))}

        {labelIndices.map((i) => {
          const x = xFor(i, count)
          const textAnchor = i === 0 ? 'start' : i === count - 1 ? 'end' : 'middle'
          return (
            <text key={history[i].date + i} x={x} y={CHART_HEIGHT - 8} className="admin-rtp-trend-axis-label" textAnchor={textAnchor}>
              {history[i].date}
            </text>
          )
        })}

        {SERIES.map((s) => {
          const points = history.map((point, i) => `${xFor(i, count)},${yFor(point[s.key])}`).join(' ')
          return (
            <polyline
              key={s.key}
              points={points}
              fill="none"
              stroke={s.color}
              strokeWidth={s.dashed ? 1.5 : 2}
              strokeDasharray={s.dashed ? '6 5' : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
              className="admin-rtp-trend-line"
              style={{ filter: `drop-shadow(0 0 3px color-mix(in srgb, ${s.color} 35%, transparent))` }}
            />
          )
        })}
      </svg>

      <div className="admin-rtp-trend-legend">
        {SERIES.map((s) => (
          <span key={s.key} className="admin-rtp-trend-legend-item">
            <svg viewBox="0 0 20 6" className="admin-rtp-trend-legend-swatch" aria-hidden="true" focusable="false">
              <line
                x1="0"
                y1="3"
                x2="20"
                y2="3"
                stroke={s.color}
                strokeWidth="2.4"
                strokeDasharray={s.dashed ? '5 3.5' : undefined}
                strokeLinecap="round"
              />
            </svg>
            {t(s.gameLabelKey)} {t(s.dashed ? 'admin.rtp.trendChart.targetSuffix' : 'admin.rtp.trendChart.actualSuffix')}
          </span>
        ))}
      </div>
    </section>
  )
}
