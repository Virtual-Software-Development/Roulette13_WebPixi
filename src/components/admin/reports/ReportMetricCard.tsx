import { useTranslation } from 'react-i18next'
import type { ReportKpiCardData } from '../../../types/adminReports'
import { CoinsIcon, PayoutIcon, RevenueBarsIcon, RtpPieIcon } from './icons'
import './reportMetricCard.css'

const ICON_BY_KEY: Record<ReportKpiCardData['icon'], typeof CoinsIcon> = {
  bets: CoinsIcon,
  payout: PayoutIcon,
  revenue: RevenueBarsIcon,
  rtp: RtpPieIcon,
}

// Variante de AdminStatCard (../../AdminStatCard.tsx) para los KPI de Reports -- misma receta
// visual (icon halo + accent + trend), pero con ícono inline en vez de <img src> (no existe un
// asset de Website_svg_icons para "coins/bets", "payout", "bar chart" ni "pie de RTP", ver
// investigación previa) y con trendTone: la variación de RTP en pp la referencia la pinta con el
// color de la card, no en verde como las otras tres (ver ReportKpiCardData).
export function ReportMetricCard({ data }: { data: ReportKpiCardData }) {
  const { t } = useTranslation()
  const Icon = ICON_BY_KEY[data.icon]

  return (
    <div className="admin-report-metric-card" data-accent={data.accent}>
      <div className="admin-report-metric-card-icon-halo">
        <span className="admin-report-metric-card-icon">
          <Icon />
        </span>
      </div>
      <div className="admin-report-metric-card-body">
        <span className="admin-report-metric-card-title">{t(data.titleKey)}</span>
        <span className="admin-report-metric-card-value">{data.value}</span>
        <div className="admin-report-metric-card-trend">
          <span className={`admin-report-metric-card-trend-value admin-report-metric-card-trend-value--${data.trendTone}`}>
            {data.trend}
          </span>
          <span className="admin-report-metric-card-trend-label">{t(data.trendLabelKey)}</span>
        </div>
      </div>
    </div>
  )
}
