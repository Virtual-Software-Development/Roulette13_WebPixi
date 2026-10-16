import { useTranslation } from 'react-i18next'
import { GAME_LABEL_KEY, RTP_GAME_ICON_URLS } from '../../data/rtpGameLabels'
import type { RtpProfileActivity } from '../../types/rtpManagement'
import { formatProfileDateTime, profileActivePeriod } from './rtpProfileFormat'
import './rtpScheduling.css'

interface RtpProfileActivityTableProps {
  activity: RtpProfileActivity[]
}

// Registro de trazabilidad (qué profile se creó/activó/desactivó, cuándo y quién) -- GET
// /rtp-profile-events. Sin columna de estado: el backend registra eventos, no un estado por evento.
export function RtpProfileActivityTable({ activity }: RtpProfileActivityTableProps) {
  const { t } = useTranslation()

  if (activity.length === 0) {
    return <p className="admin-rtp-scheduling-empty">{t('admin.rtp.management.scheduling.activityEmpty')}</p>
  }

  return (
    <div className="admin-rtp-scheduling-scroll">
      <table className="admin-rtp-scheduling-table">
        <thead>
          <tr>
            <th>{t('admin.rtp.management.scheduling.activityTable.profile')}</th>
            <th>{t('admin.rtp.management.scheduling.activityTable.game')}</th>
            <th>{t('admin.rtp.management.scheduling.activityTable.event')}</th>
            <th>{t('admin.rtp.management.scheduling.activityTable.activePeriod')}</th>
            <th>{t('admin.rtp.management.scheduling.activityTable.changedBy')}</th>
            <th>{t('admin.rtp.management.scheduling.activityTable.dateTime')}</th>
          </tr>
        </thead>
        <tbody>
          {activity.map((row) => (
            <tr key={row.id}>
              <td className="admin-rtp-scheduling-profile-name">{row.profileName}</td>
              <td>
                <span className="admin-rtp-scheduling-game">
                  <img src={RTP_GAME_ICON_URLS[row.game]} className="admin-rtp-scheduling-game-icon" alt="" />
                  {t(GAME_LABEL_KEY[row.game])}
                </span>
              </td>
              <td className="admin-rtp-scheduling-secondary">{t(`admin.rtp.management.scheduling.event.${row.event}`)}</td>
              <td className="admin-rtp-scheduling-secondary">{profileActivePeriod(row.startDate, row.expiresDate, row)}</td>
              <td className="admin-rtp-scheduling-secondary">{row.changedBy || '—'}</td>
              <td className="admin-rtp-scheduling-secondary">{formatProfileDateTime(row.dateTime)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
