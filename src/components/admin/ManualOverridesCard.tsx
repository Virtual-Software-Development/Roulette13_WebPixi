import { useTranslation } from 'react-i18next'
import { RtpKpiCardShell } from './RtpKpiCardShell'
import type { ManualOverridesData } from '../../types/rtpDashboard'
import './manualOverridesCard.css'

// Mismo layout que HouseMarginCard: valor grande centrado en el alto libre, caption al pie de la card.
export function ManualOverridesCard({ data }: { data: ManualOverridesData }) {
  const { t } = useTranslation()

  return (
    <RtpKpiCardShell icon={data.icon} titleKey="admin.rtp.manualOverrides.title" accent="amber">
      <span className="admin-manual-overrides-value">{data.value}</span>
      <span className="admin-manual-overrides-caption">{t('admin.rtp.manualOverrides.activeOverrides')}</span>
    </RtpKpiCardShell>
  )
}
