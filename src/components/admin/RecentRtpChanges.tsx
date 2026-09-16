import { useTranslation } from 'react-i18next'
import { StatusBadge } from './StatusBadge'
import { RTP_GAME_ICON_URLS } from '../../data/rtpDashboardMockData'
import type { RtpChange } from '../../types/rtpDashboard'
import './recentRtpChanges.css'

const GAME_LABEL_KEY: Record<RtpChange['game'], string> = {
  roulette: 'admin.dashboard.gamesActivity.roulette',
  pick3: 'admin.dashboard.gamesActivity.pick3',
  pick4: 'admin.dashboard.gamesActivity.pick4',
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

interface RecentRtpChangesProps {
  changes: RtpChange[]
  totalCount: number
}

export function RecentRtpChanges({ changes, totalCount }: RecentRtpChangesProps) {
  const { t } = useTranslation()

  return (
    <section className="admin-panel admin-recent-rtp-changes">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">{t('admin.rtp.changes.title')}</h2>
      </div>

      <div className="admin-recent-rtp-changes-scroll">
        <table className="admin-recent-rtp-changes-table">
          <thead>
            <tr>
              <th>{t('admin.rtp.changes.game')}</th>
              <th>{t('admin.rtp.changes.previousTarget')}</th>
              <th>{t('admin.rtp.changes.newTarget')}</th>
              <th>{t('admin.rtp.changes.changedBy')}</th>
              <th>{t('admin.rtp.changes.dateTime')}</th>
              <th>{t('admin.rtp.changes.status')}</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change) => (
              <tr key={change.id}>
                <td>
                  <span className="admin-recent-rtp-changes-game">
                    <img src={RTP_GAME_ICON_URLS[change.game]} className="admin-recent-rtp-changes-game-icon" alt="" />
                    {t(GAME_LABEL_KEY[change.game])}
                  </span>
                </td>
                <td className="admin-recent-rtp-changes-percent">{formatPercent(change.previousTarget)}</td>
                <td className="admin-recent-rtp-changes-percent">{formatPercent(change.newTarget)}</td>
                <td className="admin-recent-rtp-changes-changed-by">{change.changedBy}</td>
                <td className="admin-recent-rtp-changes-datetime">{change.dateTime}</td>
                <td>
                  <StatusBadge variant={change.status === 'applied' ? 'positive' : 'info'}>
                    {t(`admin.rtp.changes.${change.status}`)}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="admin-recent-rtp-changes-footer">
        {t('admin.rtp.changes.showingCount', { shown: changes.length, total: totalCount })}
      </p>
    </section>
  )
}
