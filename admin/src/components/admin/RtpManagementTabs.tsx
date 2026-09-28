import { useTranslation } from 'react-i18next'
import { buildMediaUrl } from '../../utils/media'
import type { RtpManagementTab } from '../../types/rtpManagement'
import './rtpManagementTabs.css'

const TAB_DEFS: { id: RtpManagementTab; labelKey: string; icon: string }[] = [
  { id: 'settings', labelKey: 'admin.rtp.management.tabs.settings', icon: buildMediaUrl('Website_svg_icons/17_gear_white.svg') },
  { id: 'simulator', labelKey: 'admin.rtp.management.tabs.simulator', icon: buildMediaUrl('Website_svg_icons/18_chart_white.svg') },
  { id: 'scheduling', labelKey: 'admin.rtp.management.tabs.scheduling', icon: buildMediaUrl('Website_svg_icons/33_calendar_white.svg') },
]

interface RtpManagementTabsProps {
  active: RtpManagementTab
  onChange: (tab: RtpManagementTab) => void
}

// Settings/Simulator/RTP Scheduling son mutuamente exclusivos (pedido explícito) -- esta barra
// solo cambia el estado `active`, el contenido lo decide RtpManagementPage.tsx. Todos los tabs
// comparten el mismo tratamiento rojo cuando están activos (pedido explícito: "el rojo representa
// SELECCIÓN dentro del Admin", no un color por tab).
export function RtpManagementTabs({ active, onChange }: RtpManagementTabsProps) {
  const { t } = useTranslation()

  return (
    <div className="admin-rtp-mgmt-tabs" role="tablist">
      {TAB_DEFS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className="admin-rtp-mgmt-tab"
          data-active={active === tab.id}
          onClick={() => onChange(tab.id)}
        >
          <img src={tab.icon} className="admin-rtp-mgmt-tab-icon" alt="" />
          {t(tab.labelKey)}
        </button>
      ))}
    </div>
  )
}
