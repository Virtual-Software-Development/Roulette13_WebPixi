import { useTranslation } from 'react-i18next'
import { StatusBadge } from './StatusBadge'
import { RTP_GAME_ICON_URLS } from '../../data/rtpDashboardMockData'
import { GAME_LABEL_KEY } from '../../data/rtpGameLabels'
import type { RtpProfileActivity, RtpProfileActivityStatus } from '../../types/rtpManagement'
import type { StatusBadgeVariant } from '../../types/rtpDashboard'
import './rtpScheduling.css'

const STATUS_VARIANT: Record<RtpProfileActivityStatus, StatusBadgeVariant> = {
  completed: 'neutral',
  active: 'positive',
  expired: 'neutral',
}

interface RtpProfileActivityTableProps {
  activity: RtpProfileActivity[]
}

// Registro de trazabilidad (pedido explícito: saber qué profile estuvo activo, cuándo, quién lo
// cambió) -- el proyecto no tiene ningún Audit Log existente para integrar (ver investigación
// previa), así que es una tabla propia, mismo lenguaje visual que RecentRtpChanges.tsx.
export function RtpProfileActivityTable({ activity }: RtpProfileActivityTableProps) {
  const { t } = useTranslation()

  if (activity.length === 0) {
    return <p className="admin-rtp-scheduling-empty">{t('admin.rtp.management.scheduling.empty')}</p>
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
            <th>{t('admin.rtp.management.scheduling.activityTable.status')}</th>
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
              <td className="admin-rtp-scheduling-secondary">{row.activePeriod}</td>
              <td className="admin-rtp-scheduling-secondary">{row.changedBy}</td>
              <td className="admin-rtp-scheduling-secondary">{row.dateTime}</td>
              <td>
                <StatusBadge variant={STATUS_VARIANT[row.status]}>{t(`admin.rtp.management.scheduling.activityStatus.${row.status}`)}</StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
