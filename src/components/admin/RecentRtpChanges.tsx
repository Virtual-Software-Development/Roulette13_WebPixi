import { useTranslation } from 'react-i18next'
import { StatusBadge } from './StatusBadge'
import { GAME_LABEL_KEY, RTP_GAME_ICON_URLS } from '../../data/rtpGameLabels'
import type { RtpChange } from '../../types/rtpDashboard'
import './recentRtpChanges.css'

function formatDateTime(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

interface RecentRtpChangesProps {
  changes: RtpChange[]
  totalCount: number
}

export function RecentRtpChanges({ changes, totalCount }: RecentRtpChangesProps) {
  const { t, i18n } = useTranslation()

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
            {changes.length === 0 && (
              <tr>
                <td colSpan={6} className="admin-recent-rtp-changes-empty">
                  {t('admin.rtp.changes.empty')}
                </td>
              </tr>
            )}
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
                <td className="admin-recent-rtp-changes-changed-by">{change.changedBy ?? t('admin.rtp.changes.system')}</td>
                <td className="admin-recent-rtp-changes-datetime">{formatDateTime(change.createdAt, i18n.language)}</td>
                <td>
                  <StatusBadge variant={change.automatic ? 'info' : 'positive'}>
                    {t(change.automatic ? 'admin.rtp.changes.autoApplied' : 'admin.rtp.changes.applied')}
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
