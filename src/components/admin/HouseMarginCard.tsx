import { useTranslation } from 'react-i18next'
import { RtpKpiCardShell } from './RtpKpiCardShell'
import { buildMediaUrl } from '../../utils/media'
import { formatCurrency } from '../../utils/currencyFormat'
import type { HouseMarginData } from '../../types/rtpDashboard'
import './houseMarginCard.css'

const ICON_URL = buildMediaUrl('Website_svg_icons/06_gold_chips_stack.svg')

// GGR (apostado - pagado) de las rondas COMPLETED de los últimos 7 días; la variación es contra los
// 7 anteriores y se omite si ese período dio 0.
export function HouseMarginCard({ data }: { data: HouseMarginData }) {
  const { t } = useTranslation()
  const change = data.changePct

  return (
    <RtpKpiCardShell icon={ICON_URL} titleKey="admin.rtp.houseMargin.title" accent="green">
      <span className="admin-house-margin-value">{formatCurrency(data.ggr)}</span>
      <span className="admin-house-margin-trend" data-direction={change !== null && change < 0 ? 'down' : 'up'}>
        {change === null ? t('admin.rtp.houseMargin.lastSevenDays') : `${change < 0 ? '↘' : '↗'} ${Math.abs(change).toFixed(1)}% ${t('admin.rtp.houseMargin.trendLabel')}`}
      </span>
    </RtpKpiCardShell>
  )
}
