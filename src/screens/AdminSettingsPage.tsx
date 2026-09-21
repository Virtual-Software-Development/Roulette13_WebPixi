import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminSettingsTabs } from '../components/admin/settings/AdminSettingsTabs'
import { GeneralSettingsTab } from '../components/admin/settings/GeneralSettingsTab'
import { SystemTab } from '../components/admin/settings/SystemTab'
import { NotificationsTab } from '../components/admin/settings/NotificationsTab'
import { DEFAULT_GENERAL_SETTINGS } from '../data/adminSettingsMockData'
import type { AdminSettingsTab, GeneralSettingsData } from '../types/adminSettings'
import '../components/admin/settings/adminSettings.css'

// Contenido puro (sin Header/Sidebar propios, ver AdminDashboardPage.tsx) -- esta página es la
// única dueña de `tab` (mutuamente exclusivos, mismo criterio que RtpManagementPage) y de
// `generalSettings` (el baseline "ya guardado"; GeneralSettingsTab es dueño de su propio draft en
// edición, mismo split que RtpManagementPage/RtpSettingsPanel).
export function AdminSettingsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<AdminSettingsTab>('general')
  const [generalSettings, setGeneralSettings] = useState<GeneralSettingsData>(DEFAULT_GENERAL_SETTINGS)

  return (
    <>
      <div className="admin-main-topbar">
        <div>
          <h1 className="admin-main-title">{t('admin.settings.title')}</h1>
          <p className="admin-main-subtitle">{t('admin.settings.subtitle')}</p>
        </div>
      </div>

      <AdminSettingsTabs active={tab} onChange={setTab} />

      {tab === 'general' && <GeneralSettingsTab settings={generalSettings} defaults={DEFAULT_GENERAL_SETTINGS} onSave={setGeneralSettings} />}
      {tab === 'system' && <SystemTab />}
      {tab === 'notifications' && <NotificationsTab />}
    </>
  )
}
