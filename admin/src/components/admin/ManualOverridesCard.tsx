import { useTranslation } from 'react-i18next'
import { RtpKpiCardShell } from './RtpKpiCardShell'
import type { ManualOverridesData } from '../../types/rtpDashboard'
import './manualOverridesCard.css'

// "Details" queda deshabilitado -- no existe todavía una vista de overrides a la que llevar (ver
// conversación: no inventar una ruta/funcionalidad nueva solo porque el botón aparece en la
// referencia). Mismo patrón que el resto de controles preparados-pero-inertes del admin panel.
export function ManualOverridesCard({ data }: { data: ManualOverridesData }) {
  const { t } = useTranslation()

  return (
    <RtpKpiCardShell icon={data.icon} titleKey="admin.rtp.manualOverrides.title" accent="amber">
      <span className="admin-manual-overrides-value">{data.value}</span>
      <span className="admin-manual-overrides-caption">{t('admin.rtp.manualOverrides.activeOverrides')}</span>
      <button type="button" className="admin-manual-overrides-details" disabled>
        {t('admin.rtp.manualOverrides.details')} &gt;
      </button>
    </RtpKpiCardShell>
  )
}
