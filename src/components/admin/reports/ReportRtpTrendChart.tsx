import { useTranslation } from 'react-i18next'
import type { ReportRtpTrendPoint } from '../../../types/adminReports'
import './reportRtpTrendChart.css'

// Distinto de components/admin/RtpTrendChart.tsx (ese grafica RTP actual/target POR JUEGO, 4
// series) -- acá es una sola línea de RTP agregado + su target, namespace propio (mismo criterio
// que el resto del Admin: secciones no comparten componentes de chart aunque el lenguaje visual
// sea el mismo). Mismo criterio de "sin librería de charts" que el resto (SVG a mano).
const CHART_WIDTH = 1000
const CHART_HEIGHT = 340
const MARGIN = { top: 12, right: 12, bottom: 30, left: 76 }
// El eje se ajusta a los datos del período: el RTP de un día puede salir de 90–100% (sobre todo
// en Quick Money). Como mínimo muestra 90–100%.
const Y_BASE = { min: 90, max: 100 }
const MAX_Y_TICKS = 6
// Etiquetas del eje X: como máximo estas, repartidas (30 días no entran todas).
const MAX_X_LABELS = 8

const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom

function yScale(values: number[]): { min: number; max: number; ticks: number[] } {
  const low = Math.min(Y_BASE.min, ...values)
  const high = Math.max(Y_BASE.max, ...values)
  const step = [2, 5, 10, 20, 25, 50, 100].find((s) => Math.ceil(high / s) - Math.floor(low / s) <= MAX_Y_TICKS - 1) ?? 100
  const min = Math.floor(low / step) * step
  const max = Math.ceil(high / step) * step
  const ticks: number[] = []
  for (let v = min; v <= max; v += step) ticks.push(v)
  return { min, max, ticks }
}

function xFor(index: number, count: number): number {
  // Un solo día (Today/Yesterday): el punto va al centro.
  if (count <= 1) return MARGIN.left + PLOT_WIDTH / 2
  return MARGIN.left + (index / (count - 1)) * PLOT_WIDTH
}

export function ReportRtpTrendChart({ series }: { series: ReportRtpTrendPoint[] }) {
  const { t } = useTranslation()
  const count = series.length
  const values = series.flatMap((point) => [point.rtp, point.target]).filter((v): v is number => v !== null)
  const scale = yScale(values)
  const yFor = (value: number) => MARGIN.top + PLOT_HEIGHT - ((value - scale.min) / (scale.max - scale.min)) * PLOT_HEIGHT
  const labelStride = Math.ceil(count / MAX_X_LABELS)
  const dotRadius = count > 14 ? 4 : 6
  const hasTarget = series.some((point) => point.target !== null)
  const pointsOf = (key: 'rtp' | 'target') =>
    series
      .map((point, i) => {
        const value = point[key]
        return value === null ? null : `${xFor(i, count)},${yFor(value)}`
      })
      .filter(Boolean)
      .join(' ')
  const rtpPoints = pointsOf('rtp')
  // Un solo día: el objetivo se dibuja como línea horizontal de lado a lado (un punto no traza nada).
  const singleTarget = count === 1 ? series[0].target : null
  const targetPoints = singleTarget !== null ? `${MARGIN.left},${yFor(singleTarget)} ${CHART_WIDTH - MARGIN.right},${yFor(singleTarget)}` : pointsOf('target')

  return (
    <section className="admin-panel admin-report-rtp-trend">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">{t('admin.reports.rtpTrend.title')}</h2>
        <div className="admin-report-rtp-trend-legend">
          <span className="admin-report-rtp-trend-legend-item">
            <span className="admin-report-rtp-trend-legend-dot" />
            {t('admin.reports.rtpTrend.rtp')}
          </span>
          {hasTarget && (
            <span className="admin-report-rtp-trend-legend-item">
              <svg viewBox="0 0 20 6" className="admin-report-rtp-trend-legend-dash" aria-hidden="true" focusable="false">
                <line x1="0" y1="3" x2="20" y2="3" stroke="var(--admin-text-secondary)" strokeWidth="2" strokeDasharray="5 3.5" strokeLinecap="round" />
              </svg>
              {t('admin.reports.rtpTrend.target')}
            </span>
          )}
        </div>
      </div>

      <svg
        className="admin-report-rtp-trend-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={t('admin.reports.rtpTrend.title')}
      >
        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line x1={MARGIN.left} x2={CHART_WIDTH - MARGIN.right} y1={yFor(tick)} y2={yFor(tick)} className="admin-report-rtp-trend-gridline" />
            <text x={MARGIN.left - 14} y={yFor(tick)} className="admin-report-rtp-trend-axis-label" textAnchor="end" dominantBaseline="middle">
              {tick}%
            </text>
          </g>
        ))}

        {series.map((point, i) => {
          if (i % labelStride !== 0) return null
          const textAnchor = count <= 1 ? 'middle' : i === 0 ? 'start' : i === count - 1 ? 'end' : 'middle'
          return (
            <text key={point.label} x={xFor(i, count)} y={CHART_HEIGHT - 8} className="admin-report-rtp-trend-axis-label" textAnchor={textAnchor}>
              {point.label}
            </text>
          )
        })}

        {hasTarget && <polyline points={targetPoints} fill="none" stroke="var(--admin-text-secondary)" strokeWidth="1.5" strokeDasharray="6 5" strokeLinejoin="round" strokeLinecap="round" />}

        <polyline
          points={rtpPoints}
          fill="none"
          stroke="var(--admin-red)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="admin-report-rtp-trend-line"
        />

        {series.map((point, i) =>
          point.rtp === null ? null : (
            <circle key={point.label} cx={xFor(i, count)} cy={yFor(point.rtp)} r={dotRadius} fill="#06111a" stroke="var(--admin-red)" strokeWidth="3" />
          ),
        )}
      </svg>
    </section>
  )
}
