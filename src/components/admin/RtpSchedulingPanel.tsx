import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBanner } from './InfoBanner'
import { RtpLoadState } from './RtpLoadState'
import { RtpProfileForm } from './RtpProfileForm'
import { RtpProfilesTable } from './RtpProfilesTable'
import { RtpProfileActivityTable } from './RtpProfileActivityTable'
import { describeRtpError, useRtpProfiles } from '../../hooks/useRtpManagement'
import type { RtpGame } from '../../types/rtpDashboard'
import type { RtpProfile, RtpSettingsData } from '../../types/rtpManagement'
import './rtpScheduling.css'

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

interface RtpSchedulingPanelProps {
  // Configuración vigente (valores iniciales de un profile nuevo); null mientras carga o si falló.
  settingsByGame: Record<RtpGame, RtpSettingsData> | null
  // El botón "Create RTP Profile" vive en RtpManagementPage (a la derecha de la barra de tabs), así
  // que el estado abierto/cerrado del formulario llega por props.
  isCreating: boolean
  onCreatingChange: (isCreating: boolean) => void
}

// Scheduling programa perfiles TEMPORALES (rtp_profile en el backend) -- no toca la configuración
// base de Settings (pedido explícito: "no mezclar Settings con Scheduling"). "Create RTP Profile"
// abre un panel a la derecha (ver RtpProfileForm.tsx).
export function RtpSchedulingPanel({ settingsByGame, isCreating, onCreatingChange }: RtpSchedulingPanelProps) {
  const { t } = useTranslation()
  const { status, profiles, activity, error, reload, create, setDisabled } = useRtpProfiles()
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)

  const handleToggleDisable = async (profile: RtpProfile) => {
    setPendingId(profile.id)
    setToggleError(null)
    try {
      await setDisabled(profile.id, profile.status !== 'disabled')
    } catch (err) {
      setToggleError(t('admin.rtp.management.scheduling.toggleError', { message: describeRtpError(err, t) }))
    } finally {
      setPendingId(null)
    }
  }

  const loadState =
    status === 'ready' ? null : <RtpLoadState error={status === 'error' ? describeRtpError(error, t) : null} onRetry={reload} />

  return (
    <div className="admin-rtp-scheduling" data-creating={isCreating}>
      <div className="admin-rtp-scheduling-main">
        <section className="admin-panel admin-rtp-scheduling-profiles">
          <div className="admin-panel-header">
            <h2 className="admin-panel-title">{t('admin.rtp.management.scheduling.scheduledProfiles')}</h2>
          </div>

          {toggleError && <InfoBanner variant="warning" title={toggleError} />}
          {loadState ?? <RtpProfilesTable profiles={profiles} pendingId={pendingId} onToggleDisable={(p) => void handleToggleDisable(p)} />}
        </section>

        <section className="admin-panel admin-rtp-scheduling-activity">
          <div className="admin-panel-header">
            <h2 className="admin-panel-title">{t('admin.rtp.management.scheduling.recentActivity')}</h2>
          </div>
          {loadState ?? <RtpProfileActivityTable activity={activity} />}
        </section>
      </div>

      {isCreating && (
        <RtpProfileForm
          existingProfiles={profiles}
          settingsByGame={settingsByGame}
          onCancel={() => onCreatingChange(false)}
          onSave={async (input) => {
            await create(input)
            onCreatingChange(false)
          }}
        />
      )}
    </div>
  )
}
