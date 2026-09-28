import { useTranslation } from 'react-i18next'
import { StatusBadge } from './StatusBadge'
import { RTP_GAME_ICON_URLS } from '../../data/rtpDashboardMockData'
import { GAME_LABEL_KEY } from '../../data/rtpGameLabels'
import type { RtpProfile, RtpProfileStatus } from '../../types/rtpManagement'
import type { StatusBadgeVariant } from '../../types/rtpDashboard'
import './rtpScheduling.css'

const STATUS_VARIANT: Record<RtpProfileStatus, StatusBadgeVariant> = {
  active: 'positive',
  scheduled: 'info',
  expiringSoon: 'warning',
  expired: 'neutral',
  disabled: 'danger',
  replaced: 'purple',
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

interface RtpProfilesTableProps {
  profiles: RtpProfile[]
  onToggleDisable: (id: string) => void
}

export function RtpProfilesTable({ profiles, onToggleDisable }: RtpProfilesTableProps) {
  const { t } = useTranslation()

  if (profiles.length === 0) {
    return <p className="admin-rtp-scheduling-empty">{t('admin.rtp.management.scheduling.empty')}</p>
  }

  return (
    <div className="admin-rtp-scheduling-scroll">
      <table className="admin-rtp-scheduling-table">
        <thead>
          <tr>
            <th>{t('admin.rtp.management.scheduling.table.profile')}</th>
            <th>{t('admin.rtp.management.scheduling.table.game')}</th>
            <th>{t('admin.rtp.management.scheduling.table.targetRtp')}</th>
            <th>{t('admin.rtp.management.scheduling.table.schedule')}</th>
            <th>{t('admin.rtp.management.scheduling.table.start')}</th>
            <th>{t('admin.rtp.management.scheduling.table.expires')}</th>
            <th>{t('admin.rtp.management.scheduling.table.status')}</th>
            <th>{t('admin.rtp.management.scheduling.table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => {
            const canToggle = profile.status === 'active' || profile.status === 'scheduled' || profile.status === 'disabled'
            return (
              <tr key={profile.id}>
                <td className="admin-rtp-scheduling-profile-name">{profile.name}</td>
                <td>
                  <span className="admin-rtp-scheduling-game">
                    <img src={RTP_GAME_ICON_URLS[profile.game]} className="admin-rtp-scheduling-game-icon" alt="" />
                    {t(GAME_LABEL_KEY[profile.game])}
                  </span>
                </td>
                <td className="admin-rtp-scheduling-percent">{formatPercent(profile.targetRtp)}</td>
                <td className="admin-rtp-scheduling-secondary">{profile.scheduleSummary}</td>
                <td className="admin-rtp-scheduling-secondary">{profile.start}</td>
                <td className="admin-rtp-scheduling-secondary">{profile.expires}</td>
                <td>
                  <StatusBadge variant={STATUS_VARIANT[profile.status]}>{t(`admin.rtp.management.scheduling.status.${profile.status}`)}</StatusBadge>
                </td>
                <td>
                  {canToggle ? (
                    <button type="button" className="admin-rtp-scheduling-action" onClick={() => onToggleDisable(profile.id)}>
                      {profile.status === 'disabled'
                        ? t('admin.rtp.management.scheduling.actionsMenu.enable')
                        : t('admin.rtp.management.scheduling.actionsMenu.disable')}
                    </button>
                  ) : (
                    <span className="admin-rtp-scheduling-secondary">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
