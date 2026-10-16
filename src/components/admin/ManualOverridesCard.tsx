import { useTranslation } from 'react-i18next'
import { RtpKpiCardShell } from './RtpKpiCardShell'
import { buildMediaUrl } from '../../utils/media'
import './manualOverridesCard.css'

const ICON_URL = buildMediaUrl('Website_svg_icons/22_shield_check_gold_thinner.svg')

// Resultados cambiados a mano (Next Results) en rondas COMPLETED de los últimos 7 días. Mismo layout
// que HouseMarginCard: valor grande centrado en el alto libre, caption al pie de la card.
export function ManualOverridesCard({ count }: { count: number }) {
  const { t } = useTranslation()

  return (
    <RtpKpiCardShell icon={ICON_URL} titleKey="admin.rtp.manualOverrides.title" accent="amber">
      <span className="admin-manual-overrides-value">{count}</span>
      <span className="admin-manual-overrides-caption">{t('admin.rtp.manualOverrides.lastSevenDays')}</span>
    </RtpKpiCardShell>
  )
}
