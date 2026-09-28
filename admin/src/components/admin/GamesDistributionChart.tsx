import { useTranslation } from 'react-i18next'
import type { GamesDistributionSegment } from '../../types/adminDashboard'
import './gamesDistributionChart.css'

const SIZE = 200
const CENTER = SIZE / 2
const RADIUS = 78
const STROKE_WIDTH = 24
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface GamesDistributionChartProps {
  segments: GamesDistributionSegment[]
  total: number
}

export function GamesDistributionChart({ segments, total }: GamesDistributionChartProps) {
  const { t } = useTranslation()

  let cumulativePercent = 0

  return (
    <section className="admin-panel admin-games-distribution">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">{t('admin.dashboard.gamesDistribution.title')}</h2>
      </div>

      <div className="admin-games-distribution-body">
        <div className="admin-games-distribution-donut">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={t('admin.dashboard.gamesDistribution.title')}>
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="rgba(120, 145, 170, 0.12)"
              strokeWidth={STROKE_WIDTH}
            />
            <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
              {segments.map((segment) => {
                const dash = (segment.percent / 100) * CIRCUMFERENCE
                const offset = -((cumulativePercent / 100) * CIRCUMFERENCE)
                cumulativePercent += segment.percent
                return (
                  <circle
                    key={segment.id}
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIUS}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={STROKE_WIDTH}
                    strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                    strokeDashoffset={offset}
                    strokeLinecap="butt"
                  />
                )
              })}
            </g>
          </svg>
          <div className="admin-games-distribution-center">
            <span className="admin-games-distribution-total">{total.toLocaleString()}</span>
            <span className="admin-games-distribution-total-label">{t('admin.dashboard.gamesDistribution.totalRounds')}</span>
          </div>
        </div>

        <ul className="admin-games-distribution-legend">
          {segments.map((segment) => (
            <li key={segment.id} className="admin-games-distribution-legend-row">
              <span className="admin-games-distribution-legend-name">
                <span className="admin-games-distribution-legend-dot" style={{ background: segment.color }} />
                {t(segment.labelKey)}
              </span>
              <span className="admin-games-distribution-legend-value">{segment.value.toLocaleString()}</span>
              <span className="admin-games-distribution-legend-percent">{segment.percent}%</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
