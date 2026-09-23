import { useTranslation } from 'react-i18next'
import type { ReportRtpTrendPoint } from '../../../types/adminReports'
import './reportRtpTrendChart.css'

// Distinto de components/admin/RtpTrendChart.tsx (ese grafica RTP actual/target POR JUEGO, 6
// series) -- acá es una sola línea de RTP agregado + su target, namespace propio (mismo criterio
// que el resto del Admin: secciones no comparten componentes de chart aunque el lenguaje visual
// sea el mismo). Mismo criterio de "sin librería de charts" que el resto (SVG a mano).
const CHART_WIDTH = 1000
const CHART_HEIGHT = 340
const MARGIN = { top: 12, right: 12, bottom: 30, left: 56 }
const Y_MIN = 90
const Y_MAX = 100
const Y_TICKS = [90, 92, 94, 96, 98, 100]

const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom

function yFor(value: number): number {
  const clamped = Math.min(Math.max(value, Y_MIN), Y_MAX)
  return MARGIN.top + PLOT_HEIGHT - ((clamped - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_HEIGHT
}

function xFor(index: number, count: number): number {
  return MARGIN.left + (index / (count - 1)) * PLOT_WIDTH
}

export function ReportRtpTrendChart({ series }: { series: ReportRtpTrendPoint[] }) {
  const { t } = useTranslation()
  const count = series.length
  const rtpPoints = series.map((point, i) => `${xFor(i, count)},${yFor(point.rtp)}`).join(' ')
  const targetPoints = series.map((point, i) => `${xFor(i, count)},${yFor(point.target)}`).join(' ')

  return (
    <section className="admin-panel admin-report-rtp-trend">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">{t('admin.reports.rtpTrend.title')}</h2>
        <div className="admin-report-rtp-trend-legend">
          <span className="admin-report-rtp-trend-legend-item">
            <span className="admin-report-rtp-trend-legend-dot" />
            {t('admin.reports.rtpTrend.rtp')}
          </span>
          <span className="admin-report-rtp-trend-legend-item">
            <svg viewBox="0 0 20 6" className="admin-report-rtp-trend-legend-dash" aria-hidden="true" focusable="false">
              <line x1="0" y1="3" x2="20" y2="3" stroke="var(--admin-text-secondary)" strokeWidth="2" strokeDasharray="5 3.5" strokeLinecap="round" />
            </svg>
            {t('admin.reports.rtpTrend.target')}
          </span>
        </div>
      </div>

      <svg
        className="admin-report-rtp-trend-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={t('admin.reports.rtpTrend.title')}
      >
        {Y_TICKS.map((tick) => (
          <g key={tick}>
            <line x1={MARGIN.left} x2={CHART_WIDTH - MARGIN.right} y1={yFor(tick)} y2={yFor(tick)} className="admin-report-rtp-trend-gridline" />
            <text x={MARGIN.left - 14} y={yFor(tick)} className="admin-report-rtp-trend-axis-label" textAnchor="end" dominantBaseline="middle">
              {tick}%
            </text>
          </g>
        ))}

        {series.map((point, i) => {
          const textAnchor = i === 0 ? 'start' : i === count - 1 ? 'end' : 'middle'
          return (
            <text key={point.label} x={xFor(i, count)} y={CHART_HEIGHT - 8} className="admin-report-rtp-trend-axis-label" textAnchor={textAnchor}>
              {point.label}
            </text>
          )
        })}

        <polyline points={targetPoints} fill="none" stroke="var(--admin-text-secondary)" strokeWidth="1.5" strokeDasharray="6 5" strokeLinejoin="round" strokeLinecap="round" />

        <polyline
          points={rtpPoints}
          fill="none"
          stroke="var(--admin-red)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="admin-report-rtp-trend-line"
        />

        {series.map((point, i) => (
          <circle key={point.label} cx={xFor(i, count)} cy={yFor(point.rtp)} r="6" fill="#06111a" stroke="var(--admin-red)" strokeWidth="3" />
        ))}
      </svg>
    </section>
  )
}
