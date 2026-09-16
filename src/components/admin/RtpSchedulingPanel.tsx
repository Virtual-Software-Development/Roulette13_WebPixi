import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RtpProfileForm } from './RtpProfileForm'
import { RtpProfilesTable } from './RtpProfilesTable'
import { RtpProfileActivityTable } from './RtpProfileActivityTable'
import { RTP_PROFILE_ACTIVITY } from '../../data/rtpManagementMockData'
import type { RtpProfile } from '../../types/rtpManagement'
import './rtpScheduling.css'

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

interface RtpSchedulingPanelProps {
  profiles: RtpProfile[]
  onProfilesChange: (profiles: RtpProfile[]) => void
}

// Scheduling programa perfiles TEMPORALES -- no toca RTP_SETTINGS_BY_GAME/Settings (pedido
// explícito: "no mezclar Settings con Scheduling"). "Create RTP Profile" abre un panel inline (sin
// modal, ver RtpProfileForm.tsx) en vez de un overlay que el proyecto no tiene.
export function RtpSchedulingPanel({ profiles, onProfilesChange }: RtpSchedulingPanelProps) {
  const { t } = useTranslation()
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = (profile: RtpProfile) => {
    onProfilesChange([profile, ...profiles])
    setIsCreating(false)
  }

  const handleToggleDisable = (id: string) => {
    onProfilesChange(profiles.map((p) => (p.id === id ? { ...p, status: p.status === 'disabled' ? 'scheduled' : 'disabled' } : p)))
  }

  return (
    <div className="admin-rtp-scheduling">
      <section className="admin-panel admin-rtp-scheduling-profiles">
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">{t('admin.rtp.management.scheduling.scheduledProfiles')}</h2>
          <button type="button" className="admin-rtp-mgmt-btn admin-rtp-mgmt-btn--primary" onClick={() => setIsCreating((v) => !v)}>
            <PlusIcon />
            {t('admin.rtp.management.scheduling.createProfile')}
          </button>
        </div>

        {isCreating && <RtpProfileForm existingProfiles={profiles} onCancel={() => setIsCreating(false)} onSave={handleCreate} />}

        <RtpProfilesTable profiles={profiles} onToggleDisable={handleToggleDisable} />
      </section>

      <section className="admin-panel admin-rtp-scheduling-activity">
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">{t('admin.rtp.management.scheduling.recentActivity')}</h2>
        </div>
        <RtpProfileActivityTable activity={RTP_PROFILE_ACTIVITY} />
      </section>
    </div>
  )
}
