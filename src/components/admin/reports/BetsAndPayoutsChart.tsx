import { useTranslation } from 'react-i18next'
import type { BetsPayoutsPoint } from '../../../types/adminReports'
import './betsAndPayoutsChart.css'

// Mismo criterio que GamesActivityChart/RtpTrendChart (../GamesActivityChart.tsx): el proyecto no
// tiene ninguna librería de charts instalada, así que el bar chart se dibuja a mano con SVG plano.
const CHART_WIDTH = 1000
const CHART_HEIGHT = 320
const MARGIN = { top: 12, right: 12, bottom: 30, left: 62 }
const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom
const BASELINE_Y = MARGIN.top + PLOT_HEIGHT

const BAR_WIDTH = 34
const BAR_GAP = 10

function yFor(value: number, yMax: number): number {
  return MARGIN.top + PLOT_HEIGHT - (Math.min(value, yMax) / yMax) * PLOT_HEIGHT
}

function formatTick(value: number): string {
  return value === 0 ? '0' : `${value / 1000}K`
}

interface BetsAndPayoutsChartProps {
  series: BetsPayoutsPoint[]
  yMax: number
  yTicks: number[]
}

export function BetsAndPayoutsChart({ series, yMax, yTicks }: BetsAndPayoutsChartProps) {
  const { t } = useTranslation()
  const count = series.length
  const groupWidth = PLOT_WIDTH / count

  return (
    <section className="admin-panel admin-bets-payouts-chart">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">{t('admin.reports.betsAndPayouts.title')}</h2>
        <div className="admin-bets-payouts-legend">
          <span className="admin-bets-payouts-legend-item">
            <span className="admin-bets-payouts-legend-dot" data-series="bets" />
            {t('admin.reports.betsAndPayouts.bets')}
          </span>
          <span className="admin-bets-payouts-legend-item">
            <span className="admin-bets-payouts-legend-dot" data-series="payout" />
            {t('admin.reports.betsAndPayouts.payout')}
          </span>
        </div>
      </div>

      <svg
        className="admin-bets-payouts-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={t('admin.reports.betsAndPayouts.title')}
      >
        <defs>
          <linearGradient id="admin-bets-payouts-bets-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--admin-blue)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--admin-blue)" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="admin-bets-payouts-payout-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--admin-red)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--admin-red)" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={MARGIN.left} x2={CHART_WIDTH - MARGIN.right} y1={yFor(tick, yMax)} y2={yFor(tick, yMax)} className="admin-bets-payouts-gridline" />
            <text x={MARGIN.left - 14} y={yFor(tick, yMax)} className="admin-bets-payouts-axis-label" textAnchor="end" dominantBaseline="middle">
              {formatTick(tick)}
            </text>
          </g>
        ))}

        {series.map((point, i) => {
          const groupCenter = MARGIN.left + groupWidth * i + groupWidth / 2
          const betsX = groupCenter - BAR_GAP / 2 - BAR_WIDTH
          const payoutX = groupCenter + BAR_GAP / 2
          const betsY = yFor(point.bets, yMax)
          const payoutY = yFor(point.payout, yMax)

          return (
            <g key={point.label}>
              <rect x={betsX} y={betsY} width={BAR_WIDTH} height={BASELINE_Y - betsY} fill="url(#admin-bets-payouts-bets-gradient)" rx="2" />
              <rect x={payoutX} y={payoutY} width={BAR_WIDTH} height={BASELINE_Y - payoutY} fill="url(#admin-bets-payouts-payout-gradient)" rx="2" />
              <text x={groupCenter} y={CHART_HEIGHT - 8} className="admin-bets-payouts-axis-label" textAnchor="middle">
                {point.label}
              </text>
            </g>
          )
        })}
      </svg>
    </section>
  )
}
