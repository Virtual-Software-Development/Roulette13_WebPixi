import { useTranslation } from 'react-i18next'
import { buildMediaUrl } from '../../../utils/media'
import { BellIcon } from './icons'
import type { AdminSettingsTab } from '../../../types/adminSettings'
import './adminSettings.css'

const ICON_DEFS: { id: Exclude<AdminSettingsTab, 'notifications'>; icon: string }[] = [
  { id: 'general', icon: buildMediaUrl('Website_svg_icons/17_gear_white.svg') },
  { id: 'system', icon: buildMediaUrl('Website_svg_icons/42_database.svg') },
]

interface AdminSettingsTabsProps {
  active: AdminSettingsTab
  onChange: (tab: AdminSettingsTab) => void
}

// General/System/Notifications -- mismo lenguaje visual que RtpManagementTabs
// (rojo = selección dentro del Admin), pero sin acoplarse a esa clase/componente (específico de RTP
// Management, ver adminSettings.css) porque acá el set de tabs e íconos es distinto. Notifications
// no tiene SVG en Website_svg_icons (ver investigación previa), así que es el único que renderiza
// un ícono inline en vez de <img>.
export function AdminSettingsTabs({ active, onChange }: AdminSettingsTabsProps) {
  const { t } = useTranslation()

  return (
    <div className="admin-settings-tabs" role="tablist">
      {ICON_DEFS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className="admin-settings-tab"
          data-active={active === tab.id}
          onClick={() => onChange(tab.id)}
        >
          <img src={tab.icon} className="admin-settings-tab-icon" alt="" />
          {t(`admin.settings.tabs.${tab.id}`)}
        </button>
      ))}
      <button
        type="button"
        role="tab"
        aria-selected={active === 'notifications'}
        className="admin-settings-tab"
        data-active={active === 'notifications'}
        onClick={() => onChange('notifications')}
      >
        <span className="admin-settings-tab-icon admin-settings-tab-icon--inline">
          <BellIcon />
        </span>
        {t('admin.settings.tabs.notifications')}
      </button>
    </div>
  )
}
