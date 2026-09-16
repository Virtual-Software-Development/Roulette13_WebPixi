import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { RtpKpiAccent } from '../../types/rtpDashboard'
import './rtpKpiCardShell.css'

interface RtpKpiCardShellProps {
  icon: string
  titleKey: string
  accent: RtpKpiAccent
  children: ReactNode
}

// Shell compartido por las 5 KPI cards de la fila de RTP (RtpMetricCard x3, HouseMarginCard,
// ManualOverridesCard) -- mismo header (ícono circular + título), mismo fondo/borde/accent, cada
// una aporta solo su propio contenido debajo. Distinto de AdminStatCard (Dashboard): ahí el ícono
// vive al costado del valor; acá el ícono va en una fila propia junto al título porque el resto
// de la card necesita más alto (Current/Target + badge, o valor + trend + botón Details).
export function RtpKpiCardShell({ icon, titleKey, accent, children }: RtpKpiCardShellProps) {
  const { t } = useTranslation()

  return (
    <div className="admin-rtp-kpi-card" data-accent={accent}>
      <div className="admin-rtp-kpi-card-header">
        <span className="admin-rtp-kpi-card-icon-halo">
          <img src={icon} className="admin-rtp-kpi-card-icon" alt="" />
        </span>
        <span className="admin-rtp-kpi-card-title">{t(titleKey)}</span>
      </div>
      {children}
    </div>
  )
}
