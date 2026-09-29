import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RtpProfileForm } from './RtpProfileForm'
import { RtpProfilesTable } from './RtpProfilesTable'
import { RtpProfileActivityTable } from './RtpProfileActivityTable'
import { createRtpProfileApi, setRtpProfileDisabledApi } from '../../api/rtpProfiles'
import type { RtpProfile, RtpProfileActivity } from '../../types/rtpManagement'
import type { CreateRtpProfileInput } from '../../types/rtpProfileApi'
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
  // Called after a create/disable/enable succeeds so the parent re-fetches the canonical list
  // (GET /rtp-profiles) shortly after. The optimistic onProfilesChange update above is just for
  // instant feedback -- without this follow-up, a create that happens to land before the page's
  // very first GET has resolved would prepend onto that stale initial mock seed permanently (it's
  // only ever replaced once, on mount), leaving fake demo rows mixed in with real ones until the
  // next full page reload.
  onProfilesRefresh: () => void
  activity: RtpProfileActivity[]
  // Same idea as onProfilesRefresh, for the activity log (GET /rtp-profile-events) -- this panel
  // doesn't construct activity rows itself, since the real changedBy/timestamp only exist once the
  // backend has actually logged the event.
  onActivityRefresh: () => void
}

// Scheduling programa perfiles TEMPORALES -- no toca RTP_SETTINGS_BY_GAME/Settings (pedido
// explícito: "no mezclar Settings con Scheduling"). "Create RTP Profile" abre un panel inline (sin
// modal, ver RtpProfileForm.tsx) en vez de un overlay que el proyecto no tiene.
//
// Create/disable optimistically update `profiles` immediately (same instant feedback as before),
// then persist for real via POST/PATCH /rtp-profiles -- if that call fails, the change stays
// visible locally (matches this panel's original no-error-UI behavior) but is logged to the
// console rather than silently pretending it was saved.
export function RtpSchedulingPanel({ profiles, onProfilesChange, onProfilesRefresh, activity, onActivityRefresh }: RtpSchedulingPanelProps) {
  const { t } = useTranslation()
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async (profile: RtpProfile, raw: CreateRtpProfileInput) => {
    setIsCreating(false)
    try {
      const created = await createRtpProfileApi(raw)
      onProfilesChange([{ ...profile, id: String(created.id) }, ...profiles])
      onProfilesRefresh()
      onActivityRefresh()
    } catch (err) {
      console.error('No se pudo guardar el perfil de RTP en el servidor', err)
      onProfilesChange([profile, ...profiles])
    }
  }

  const handleToggleDisable = (id: string) => {
    const target = profiles.find((p) => p.id === id)
    const nextDisabled = target?.status !== 'disabled'
    onProfilesChange(profiles.map((p) => (p.id === id ? { ...p, status: p.status === 'disabled' ? 'scheduled' : 'disabled' } : p)))

    // A profile whose id isn't a real database id yet (still the client-side placeholder from a
    // create that hasn't round-tripped, or one of the original demo rows before the real list has
    // loaded) has nothing to persist against.
    const numericId = Number(id)
    if (!Number.isFinite(numericId)) return

    setRtpProfileDisabledApi(numericId, nextDisabled)
      .then(() => {
        onProfilesRefresh()
        onActivityRefresh()
      })
      .catch((err) => console.error('No se pudo actualizar el estado del perfil de RTP', err))
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
        <RtpProfileActivityTable activity={activity} />
      </section>
    </div>
  )
}
