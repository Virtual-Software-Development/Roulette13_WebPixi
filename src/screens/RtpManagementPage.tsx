import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RtpManagementTabs } from '../components/admin/RtpManagementTabs'
import { RtpSettingsPanel } from '../components/admin/RtpSettingsPanel'
import { RtpSimulatorPanel } from '../components/admin/RtpSimulatorPanel'
import { PlusIcon, RtpSchedulingPanel } from '../components/admin/RtpSchedulingPanel'
import { RTP_PROFILES, RTP_SETTINGS_BY_GAME } from '../data/rtpManagementMockData'
import type { RtpGame } from '../types/rtpDashboard'
import type { RtpManagementTab, RtpProfile, RtpSettingsData } from '../types/rtpManagement'
import '../components/admin/rtpManagementShared.css'
import './rtpManagementPage.css'

// RTP Management -- tercer contenido posible dentro de AdminPanel.tsx (junto a AdminDashboardPage/
// RtpDashboardPage). Settings/Simulator/Scheduling son mutuamente exclusivos (pedido explícito):
// esta página es la única dueña de `tab`, cada uno de los tres solo recibe lo que necesita por
// props. settingsByGame vive acá (no en RtpSettingsPanel) porque Simulator necesita leer el mismo
// Current Target RTP que Settings, sin que ambos tabs queden desincronizados.
export function RtpManagementPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<RtpManagementTab>('settings')
  const [settingsByGame, setSettingsByGame] = useState<Record<RtpGame, RtpSettingsData>>(RTP_SETTINGS_BY_GAME)
  const [profiles, setProfiles] = useState<RtpProfile[]>(RTP_PROFILES)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)

  const handleSaveSettings = (game: RtpGame, data: RtpSettingsData) => {
    setSettingsByGame((prev) => ({ ...prev, [game]: data }))
  }

  return (
    <>
      <div className="admin-main-topbar">
        <div>
          <h1 className="admin-main-title">{t('admin.rtp.management.title')}</h1>
          <p className="admin-main-subtitle">{t('admin.rtp.management.subtitle')}</p>
        </div>
      </div>

      {/* "Create RTP Profile" a la derecha de la barra de tabs, solo en RTP Scheduling (antes dentro
          del header del panel Scheduled Profiles). */}
      <div className="admin-rtp-management-tabs-row">
        <RtpManagementTabs active={tab} onChange={setTab} />
        {tab === 'scheduling' && (
          <button
            type="button"
            className="admin-rtp-mgmt-btn admin-rtp-mgmt-btn--primary"
            aria-expanded={isCreatingProfile}
            onClick={() => setIsCreatingProfile((v) => !v)}
          >
            <PlusIcon />
            {t('admin.rtp.management.scheduling.createProfile')}
          </button>
        )}
      </div>

      {tab === 'settings' && <RtpSettingsPanel settingsByGame={settingsByGame} onSave={handleSaveSettings} />}
      {tab === 'simulator' && <RtpSimulatorPanel settingsByGame={settingsByGame} />}
      {tab === 'scheduling' && (
        <RtpSchedulingPanel
          profiles={profiles}
          onProfilesChange={setProfiles}
          isCreating={isCreatingProfile}
          onCreatingChange={setIsCreatingProfile}
        />
      )}
    </>
  )
}
