import { useTranslation } from 'react-i18next'
import type { RtpBand, RtpGame, RtpHistoryPoint } from '../../types/rtpDashboard'

// Vista "Deviation" de RtpTrendChart: una fila por juego con actual - target (puntos porcentuales)
// alrededor de 0 y la banda permitida sombreada. Filas separadas (small multiples) en vez de un
// solo chart porque cada juego tiene su propia banda (Roulette -4/+2, Pick 3/Pick 4 ±2) -- en un
// mismo eje las tres bandas se superponían. Mismo criterio SVG a mano que RtpTrendChart.
const ROW_WIDTH = 1000
const ROW_HEIGHT = 124
const ROW_PADDING_Y = 10
const AXIS_LABEL_WIDTH = 46
const X_AXIS_HEIGHT = 26
const PLOT_LEFT = AXIS_LABEL_WIDTH
const PLOT_RIGHT = ROW_WIDTH - 8
const PLOT_WIDTH = PLOT_RIGHT - PLOT_LEFT

interface DeviationGame {
  id: RtpGame
  actualKey: keyof Omit<RtpHistoryPoint, 'date'>
  targetKey: keyof Omit<RtpHistoryPoint, 'date'>
  color: string
  labelKey: string
}

const GAMES: DeviationGame[] = [
  { id: 'roulette', actualKey: 'rouletteActual', targetKey: 'rouletteTarget', color: 'var(--admin-red)', labelKey: 'admin.dashboard.gamesActivity.roulette' },
  { id: 'pick3', actualKey: 'pick3Actual', targetKey: 'pick3Target', color: 'var(--admin-green)', labelKey: 'admin.dashboard.gamesActivity.pick3' },
  { id: 'pick4', actualKey: 'pick4Actual', targetKey: 'pick4Target', color: 'var(--admin-amber)', labelKey: 'admin.dashboard.gamesActivity.pick4' },
]

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function formatPp(value: number): string {
  const rounded = round1(value)
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : '±'}${Math.abs(rounded).toFixed(1)}`
}

interface RtpDeviationRowsProps {
  history: RtpHistoryPoint[]
  bands: RtpBand[]
  labelIndices: number[]
}

export function RtpDeviationRows({ history, bands, labelIndices }: RtpDeviationRowsProps) {
  const { t } = useTranslation()
  const count = history.length
  const xFor = (index: number) => PLOT_LEFT + (count > 1 ? (index / (count - 1)) * PLOT_WIDTH : PLOT_WIDTH / 2)

  return (
    <div className="admin-rtp-deviation">
      {GAMES.map((game, gameIndex) => {
        const band = bands.find((b) => b.id === game.id)
        const deviations = history.map((point) => round1(point[game.actualKey] - point[game.targetKey]))
        const latestTarget = history[count - 1]?.[game.targetKey] ?? 0
        // Banda relativa al target (ej. Roulette 92–98 con target 96 -> -4 / +2).
        const bandLow = band ? round1(band.min - latestTarget) : -1
        const bandHigh = band ? round1(band.max - latestTarget) : 1
        const outFlags = deviations.map((d) => d < bandLow || d > bandHigh)
        const latest = deviations[count - 1] ?? 0
        const latestOut = outFlags[count - 1] ?? false
        const outCount = outFlags.filter(Boolean).length

        // Escala propia de cada fila: de lo más bajo a lo más alto entre banda y datos, con aire --
        // así la banda llena la fila aunque sea asimétrica (Roulette -4 / +2).
        const lowest = Math.min(bandLow, ...deviations)
        const highest = Math.max(bandHigh, ...deviations)
        const pad = (highest - lowest) * 0.18
        const yMin = lowest - pad
        const yMax = highest + pad
        const isLastRow = gameIndex === GAMES.length - 1
        const svgHeight = ROW_HEIGHT + (isLastRow ? X_AXIS_HEIGHT : 0)
        const yFor = (value: number) => ROW_PADDING_Y + ((yMax - value) / (yMax - yMin)) * (ROW_HEIGHT - 2 * ROW_PADDING_Y)
        const points = deviations.map((d, i) => `${xFor(i)},${yFor(d)}`).join(' ')

        return (
          <div key={game.id} className="admin-rtp-deviation-row">
            <div className="admin-rtp-deviation-info">
              <span className="admin-rtp-deviation-game">
                <span className="admin-rtp-deviation-dot" style={{ background: game.color }} />
                {t(game.labelKey)}
              </span>
              <span className="admin-rtp-deviation-value" data-out={latestOut}>
                {formatPp(latest)} {t('admin.rtp.trendChart.deviation.ppUnit')}
              </span>
              <span className="admin-rtp-deviation-status" data-out={latestOut}>
                {latestOut ? t('admin.rtp.trendChart.deviation.outOfBand') : t('admin.rtp.trendChart.deviation.withinBand')}
              </span>
              <span className="admin-rtp-deviation-band">
                {t('admin.rtp.trendChart.deviation.band', { low: formatPp(bandLow), high: formatPp(bandHigh) })}
              </span>
              {outCount > 0 && (
                <span className="admin-rtp-deviation-days-out">{t('admin.rtp.trendChart.deviation.daysOut', { count: outCount })}</span>
              )}
            </div>

            <svg
              className="admin-rtp-deviation-svg"
              viewBox={`0 0 ${ROW_WIDTH} ${svgHeight}`}
              preserveAspectRatio="none"
              style={{ aspectRatio: `${ROW_WIDTH} / ${svgHeight}` }}
              role="img"
              aria-label={`${t(game.labelKey)} ${t('admin.rtp.trendChart.views.deviation')}`}
            >
              <rect
                x={PLOT_LEFT}
                y={yFor(bandHigh)}
                width={PLOT_WIDTH}
                height={yFor(bandLow) - yFor(bandHigh)}
                fill={game.color}
                opacity={0.09}
              />
              <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={yFor(bandHigh)} y2={yFor(bandHigh)} stroke={game.color} className="admin-rtp-deviation-band-edge" />
              <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={yFor(bandLow)} y2={yFor(bandLow)} stroke={game.color} className="admin-rtp-deviation-band-edge" />
              <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={yFor(0)} y2={yFor(0)} className="admin-rtp-deviation-zero" />

              {[bandHigh, 0, bandLow].map((tick) => (
                <text key={tick} x={PLOT_LEFT - 8} y={yFor(tick)} className="admin-rtp-deviation-axis-label" textAnchor="end" dominantBaseline="middle">
                  {tick === 0 ? '0' : formatPp(tick)}
                </text>
              ))}

              <polyline
                points={points}
                fill="none"
                stroke={game.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                className="admin-rtp-trend-line"
              />
              {deviations.map((d, i) =>
                outFlags[i] ? <circle key={i} cx={xFor(i)} cy={yFor(d)} r={4.5} className="admin-rtp-deviation-out-point" /> : null,
              )}

              {isLastRow &&
                labelIndices.map((i) => (
                  <text
                    key={history[i].date + i}
                    x={xFor(i)}
                    y={svgHeight - 6}
                    className="admin-rtp-deviation-axis-label"
                    textAnchor={i === 0 ? 'start' : i === count - 1 ? 'end' : 'middle'}
                  >
                    {history[i].date}
                  </text>
                ))}
            </svg>
          </div>
        )
      })}
    </div>
  )
}
