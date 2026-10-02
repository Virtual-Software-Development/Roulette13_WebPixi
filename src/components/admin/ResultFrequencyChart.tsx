import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getRouletteColor, type RouletteColor } from '../../utils/rouletteColors'
import type { ResultFrequencyBucket, ResultFrequencyByGame, ResultFrequencyGame, ResultFrequencyWindow } from '../../types/adminDashboard'
import './resultFrequencyChart.css'

// Barras en SVG plano, mismo criterio que GameEventsOverTimeChart/GamePerformanceChart (el proyecto
// no tiene librería de charts). Solo resultados ya sorteados: sirve como chequeo de aleatoriedad
// (sobre todo con overrides manuales de Next Results), nunca muestra apuestas de la ronda en curso.
const CHART_WIDTH = 1000
const CHART_HEIGHT = 300
const MARGIN = { top: 14, right: 8, bottom: 34, left: 46 }
const BAR_GAP_RATIO = 0.22

const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom
const BASELINE_Y = MARGIN.top + PLOT_HEIGHT

const GAMES: { id: ResultFrequencyGame; labelKey: string }[] = [
  { id: 'roulette', labelKey: 'admin.dashboard.gamesActivity.roulette' },
  { id: 'pick3', labelKey: 'admin.dashboard.gamesActivity.pick3' },
  { id: 'pick4', labelKey: 'admin.dashboard.gamesActivity.pick4' },
]

const WINDOWS: ResultFrequencyWindow[] = [100, 500, 1000]

// Mismos colores de juego que Recent Rounds (columna GAME); en Roulette cada barra usa el color
// real de su casilla. "Black" se pinta gris pizarra -- negro puro desaparece sobre el fondo oscuro.
const GAME_BAR_COLOR: Record<Exclude<ResultFrequencyGame, 'roulette'>, string> = {
  pick3: 'var(--admin-green)',
  pick4: 'var(--admin-amber)',
}

const ROULETTE_BAR_COLOR: Record<RouletteColor, string> = {
  red: 'var(--admin-red)',
  black: '#6b7a8c',
  green: 'var(--admin-green)',
}

const HOT_COLD_COUNT = 3

function rouletteColorOf(key: string): RouletteColor {
  return getRouletteColor(key === '00' ? '00' : Number(key))
}

function barColorOf(game: ResultFrequencyGame, key: string): string {
  return game === 'roulette' ? ROULETTE_BAR_COLOR[rouletteColorOf(key)] : GAME_BAR_COLOR[game]
}

// Escala "redonda" hacia arriba con ~4-6 gridlines (1/2/5 × 10^n), mismo criterio que
// GamePerformanceChart.
function niceScale(maxValue: number): { yMax: number; ticks: number[] } {
  if (maxValue <= 0) return { yMax: 1, ticks: [0, 1] }
  const rough = maxValue / 4
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude
  const yMax = Math.ceil(maxValue / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= yMax + step / 2; v += step) ticks.push(v)
  return { yMax, ticks }
}

// Orden estable: empates se resuelven por el orden original del eje (0, 00, 1, 2...).
function rankBuckets(buckets: ResultFrequencyBucket[], direction: 'hot' | 'cold'): ResultFrequencyBucket[] {
  const sign = direction === 'hot' ? -1 : 1
  return buckets
    .map((bucket, index) => ({ bucket, index }))
    .sort((a, b) => sign * (a.bucket.count - b.bucket.count) || a.index - b.index)
    .slice(0, HOT_COLD_COUNT)
    .map(({ bucket }) => bucket)
}

export function ResultFrequencyChart({ dataByGame }: { dataByGame: ResultFrequencyByGame }) {
  const { t, i18n } = useTranslation()
  const [game, setGame] = useState<ResultFrequencyGame>('roulette')
  const [windowSize, setWindowSize] = useState<ResultFrequencyWindow>(500)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const data = dataByGame[game][windowSize]
  const buckets = data.buckets
  const expected = buckets.length > 0 ? data.draws / buckets.length : 0
  const numberFormat = new Intl.NumberFormat(i18n.language)
  const decimalFormat = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })

  const { yMax, ticks } = niceScale(Math.max(expected, ...buckets.map((b) => b.count)))
  const yFor = (value: number) => MARGIN.top + PLOT_HEIGHT - (value / yMax) * PLOT_HEIGHT
  const slotWidth = PLOT_WIDTH / Math.max(buckets.length, 1)
  const barWidth = slotWidth * (1 - BAR_GAP_RATIO)
  const slotX = (index: number) => MARGIN.left + index * slotWidth

  const hot = rankBuckets(buckets, 'hot')
  const cold = rankBuckets(buckets, 'cold')

  const colorSplit =
    game === 'roulette'
      ? (['red', 'black', 'green'] as const).map((color) => ({
          color,
          percent: data.draws > 0 ? (buckets.filter((b) => rouletteColorOf(b.key) === color).reduce((sum, b) => sum + b.count, 0) / data.draws) * 100 : 0,
        }))
      : null

  const hovered = hoveredIndex !== null ? buckets[hoveredIndex] : null
  const hoveredCenterPercent = hoveredIndex !== null ? ((slotX(hoveredIndex) + slotWidth / 2) / CHART_WIDTH) * 100 : 0
  const deviationOf = (count: number) => (expected > 0 ? ((count - expected) / expected) * 100 : 0)

  const changeGame = (next: ResultFrequencyGame) => {
    setGame(next)
    setHoveredIndex(null)
  }

  const renderPill = (bucket: ResultFrequencyBucket) => (
    <span
      key={bucket.key}
      className="admin-result-frequency-pill"
      data-tone={game === 'roulette' ? rouletteColorOf(bucket.key) : 'white'}
      title={t('admin.dashboard.resultFrequency.timesCount', { count: bucket.count })}
    >
      {bucket.key}
    </span>
  )

  return (
    <section className="admin-panel admin-result-frequency">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">{t('admin.dashboard.resultFrequency.title')}</h2>
          <p className="admin-result-frequency-subtitle">
            {t('admin.dashboard.resultFrequency.subtitle', { rounds: numberFormat.format(data.rounds) })}
          </p>
        </div>
      </div>

      <div className="admin-result-frequency-controls">
        <div className="admin-result-frequency-segmented" role="group" aria-label={t('admin.dashboard.resultFrequency.gameLabel')}>
          {GAMES.map((option) => (
            <button
              key={option.id}
              type="button"
              className="admin-result-frequency-segment"
              data-selected={option.id === game}
              aria-pressed={option.id === game}
              onClick={() => changeGame(option.id)}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
        <div className="admin-result-frequency-segmented" role="group" aria-label={t('admin.dashboard.resultFrequency.windowLabel')}>
          {WINDOWS.map((option) => (
            <button
              key={option}
              type="button"
              className="admin-result-frequency-segment"
              data-selected={option === windowSize}
              aria-pressed={option === windowSize}
              onClick={() => setWindowSize(option)}
            >
              {numberFormat.format(option)}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-result-frequency-plot" onMouseLeave={() => setHoveredIndex(null)}>
        <svg
          className="admin-result-frequency-svg"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={t('admin.dashboard.resultFrequency.title')}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={CHART_WIDTH - MARGIN.right} y1={yFor(tick)} y2={yFor(tick)} className="admin-result-frequency-gridline" />
              <text x={MARGIN.left - 12} y={yFor(tick)} className="admin-result-frequency-axis-label" textAnchor="end" dominantBaseline="middle">
                {numberFormat.format(tick)}
              </text>
            </g>
          ))}

          {buckets.map((bucket, i) => {
            const y = yFor(bucket.count)
            return (
              <g
                key={bucket.key}
                className="admin-result-frequency-bar"
                data-dimmed={hoveredIndex !== null && hoveredIndex !== i}
                onMouseEnter={() => setHoveredIndex(i)}
              >
                {/* Hit area de alto completo -- el hover no depende de apuntar justo a la barra. */}
                <rect x={slotX(i)} y={MARGIN.top} width={slotWidth} height={PLOT_HEIGHT} fill="transparent" />
                <rect
                  x={slotX(i) + (slotWidth - barWidth) / 2}
                  y={y}
                  width={barWidth}
                  height={Math.max(BASELINE_Y - y, 0)}
                  rx={Math.min(3, barWidth / 4)}
                  fill={barColorOf(game, bucket.key)}
                />
                <text x={slotX(i) + slotWidth / 2} y={CHART_HEIGHT - 10} className="admin-result-frequency-axis-label" textAnchor="middle">
                  {bucket.key}
                </text>
              </g>
            )
          })}

          <line x1={MARGIN.left} x2={CHART_WIDTH - MARGIN.right} y1={yFor(expected)} y2={yFor(expected)} className="admin-result-frequency-expected" />
          <line x1={MARGIN.left} x2={CHART_WIDTH - MARGIN.right} y1={BASELINE_Y} y2={BASELINE_Y} className="admin-result-frequency-baseline" />
        </svg>

        {hovered && (
          <div
            className="admin-result-frequency-tooltip"
            data-align={hoveredCenterPercent > 70 ? 'right' : 'left'}
            style={{ left: `${hoveredCenterPercent}%` }}
          >
            <div className="admin-result-frequency-tooltip-title">
              {t(game === 'roulette' ? 'admin.dashboard.resultFrequency.number' : 'admin.dashboard.resultFrequency.digit', { value: hovered.key })}
            </div>
            <div className="admin-result-frequency-tooltip-row">
              <span>{t('admin.dashboard.resultFrequency.drawn')}</span>
              <span className="admin-result-frequency-tooltip-value">{t('admin.dashboard.resultFrequency.timesCount', { count: hovered.count })}</span>
            </div>
            <div className="admin-result-frequency-tooltip-row">
              <span>{t('admin.dashboard.resultFrequency.expected')}</span>
              <span className="admin-result-frequency-tooltip-value">{decimalFormat.format(expected)}</span>
            </div>
            <div className="admin-result-frequency-tooltip-row">
              <span>{t('admin.dashboard.resultFrequency.deviation')}</span>
              <span className="admin-result-frequency-tooltip-value">
                {deviationOf(hovered.count) > 0 ? '+' : ''}
                {decimalFormat.format(deviationOf(hovered.count))}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="admin-result-frequency-footer">
        <div className="admin-result-frequency-group">
          <span className="admin-result-frequency-group-label">{t('admin.dashboard.resultFrequency.hot')}</span>
          {hot.map(renderPill)}
        </div>
        <div className="admin-result-frequency-group">
          <span className="admin-result-frequency-group-label">{t('admin.dashboard.resultFrequency.cold')}</span>
          {cold.map(renderPill)}
        </div>
        {colorSplit && (
          <div className="admin-result-frequency-group admin-result-frequency-split">
            {colorSplit.map(({ color, percent }) => (
              <span key={color} className="admin-result-frequency-split-item">
                <span className="admin-result-frequency-dot" style={{ background: ROULETTE_BAR_COLOR[color] }} />
                {t(`admin.dashboard.resultFrequency.colors.${color}`)} {decimalFormat.format(percent)}%
              </span>
            ))}
          </div>
        )}
        <span className="admin-result-frequency-legend">
          <span className="admin-result-frequency-legend-line" aria-hidden="true" />
          {t('admin.dashboard.resultFrequency.expectedLegend')}
        </span>
      </div>
    </section>
  )
}
