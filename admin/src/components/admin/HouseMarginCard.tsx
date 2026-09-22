import { useTranslation } from 'react-i18next'
import { RtpKpiCardShell } from './RtpKpiCardShell'
import type { HouseMarginData } from '../../types/rtpDashboard'
import './houseMarginCard.css'

export function HouseMarginCard({ data }: { data: HouseMarginData }) {
  const { t } = useTranslation()

  return (
    <RtpKpiCardShell icon={data.icon} titleKey="admin.rtp.houseMargin.title" accent="green">
      <span className="admin-house-margin-value">{data.value}</span>
      <span className="admin-house-margin-trend">
        {data.trendDirection === 'up' ? '↗' : '↘'} {data.trend} {t(data.trendLabelKey)}
      </span>
    </RtpKpiCardShell>
  )
}
