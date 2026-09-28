import { useTranslation } from 'react-i18next'
import type { AdminStatCardData } from '../../types/adminDashboard'
import './adminStatCard.css'

export function AdminStatCard({ data }: { data: AdminStatCardData }) {
  const { t } = useTranslation()

  return (
    <div className="admin-stat-card" data-accent={data.accent}>
      <div className="admin-stat-card-icon-halo">
        <img src={data.icon} className="admin-stat-card-icon" alt="" />
      </div>
      <div className="admin-stat-card-body">
        <span className="admin-stat-card-title">{t(data.titleKey)}</span>
        <span className="admin-stat-card-value">{data.value}</span>
        <div className="admin-stat-card-trend">
          <span className={`admin-stat-card-trend-value admin-stat-card-trend-value--${data.trendDirection}`}>
            {data.trendDirection === 'up' ? '↗' : '↘'} {data.trend}
          </span>
          <span className="admin-stat-card-trend-label">{t(data.trendLabelKey)}</span>
        </div>
      </div>
    </div>
  )
}
