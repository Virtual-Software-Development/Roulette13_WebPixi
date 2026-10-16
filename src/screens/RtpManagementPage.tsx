import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RtpManagementTabs } from '../components/admin/RtpManagementTabs'
import { RtpSettingsPanel } from '../components/admin/RtpSettingsPanel'
import { RtpSimulatorPanel } from '../components/admin/RtpSimulatorPanel'
import { PlusIcon, RtpSchedulingPanel } from '../components/admin/RtpSchedulingPanel'
import { RtpLoadState } from '../components/admin/RtpLoadState'
import { describeRtpError, useRtpSettings } from '../hooks/useRtpManagement'
import type { RtpManagementTab } from '../types/rtpManagement'
import '../components/admin/rtpManagementShared.css'
import './rtpManagementPage.css'

// RTP Management -- tercer contenido posible dentro de AdminPanel.tsx (junto a AdminDashboardPage/
// RtpDashboardPage). Settings/Simulator/Scheduling son mutuamente exclusivos (pedido explícito):
// esta página es la única dueña de `tab`, cada uno de los tres solo recibe lo que necesita por
// props. Settings y Scheduling leen/escriben quick-money-backend (hooks/useRtpManagement.ts); la
// configuración vigente se carga acá porque Scheduling la usa como valores iniciales de un profile
// nuevo. Simulator trae la suya del backend junto con la simulación (api/rtpSimulator.ts).
export function RtpManagementPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<RtpManagementTab>('settings')
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const settings = useRtpSettings()

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

      {tab === 'settings' &&
        (settings.settingsByGame ? (
          <RtpSettingsPanel settingsByGame={settings.settingsByGame} onSave={settings.save} />
        ) : (
          <section className="admin-panel">
            <RtpLoadState
              error={settings.status === 'error' ? describeRtpError(settings.error, t) : null}
              onRetry={() => void settings.reload()}
            />
          </section>
        ))}
      {tab === 'simulator' && <RtpSimulatorPanel />}
      {tab === 'scheduling' && (
        <RtpSchedulingPanel
          settingsByGame={settings.settingsByGame}
          isCreating={isCreatingProfile}
          onCreatingChange={setIsCreatingProfile}
        />
      )}
    </>
  )
}
