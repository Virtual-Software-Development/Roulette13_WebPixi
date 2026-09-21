import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { buildMediaUrl } from '../../../utils/media'
import { parseApiDateTime } from '../../../utils/time'
import { CHANNEL_ICONS } from './notificationChannelIcons'
import type { RecentNotification } from '../../../types/adminSettings'
import './adminSettings.css'

const REFRESH_ICON_URL = buildMediaUrl('Website_svg_icons/39_refresh_white_clean.svg')
const ARROW_RIGHT_ICON_URL = buildMediaUrl('Website_svg_icons/10_arrow_right_white.svg')

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

// Sin backend real de notificaciones (ver conversación) -- Refresh simula el flujo visual
// loading->success con el mismo criterio mock que el resto de Settings; como no hay una fuente de
// datos real detrás, "recargar" vuelve a mostrar el mismo set fijo (RECENT_NOTIFICATIONS).
const REFRESH_DURATION_MS = 700

interface RecentNotificationsCardProps {
  notifications: RecentNotification[]
  onRefresh: () => void
}

export function RecentNotificationsCard({ notifications, onRefresh }: RecentNotificationsCardProps) {
  const { t } = useTranslation()
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (!isRefreshing) return
    const timer = setTimeout(() => {
      onRefresh()
      setIsRefreshing(false)
    }, REFRESH_DURATION_MS)
    return () => clearTimeout(timer)
  }, [isRefreshing, onRefresh])

  return (
    <section className="admin-panel admin-settings-card">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">{t('admin.settings.notifications.recent.title')}</h2>
          <p className="admin-settings-card-subtitle">{t('admin.settings.notifications.recent.subtitle')}</p>
        </div>
        <div className="admin-settings-card-header-actions">
          <button
            type="button"
            className="admin-settings-btn admin-settings-btn--ghost admin-settings-btn--compact"
            disabled={isRefreshing}
            onClick={() => setIsRefreshing(true)}
          >
            <img src={REFRESH_ICON_URL} className={isRefreshing ? 'admin-settings-refresh-icon--spinning' : ''} alt="" />
            {t('admin.settings.notifications.recent.refresh')}
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <p className="admin-settings-empty">{t('admin.settings.notifications.recent.empty')}</p>
      ) : (
        <div className="admin-settings-notifications-scroll">
          <table className="admin-settings-notifications-table">
            <thead>
              <tr>
                <th>{t('admin.settings.notifications.recent.table.dateTime')}</th>
                <th>{t('admin.settings.notifications.recent.table.event')}</th>
                <th>{t('admin.settings.notifications.recent.table.channel')}</th>
                <th>{t('admin.settings.notifications.recent.table.status')}</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((notification) => (
                <tr key={notification.id}>
                  <td className="admin-settings-notifications-time">{TIMESTAMP_FORMATTER.format(parseApiDateTime(notification.timestamp))}</td>
                  <td>{notification.message}</td>
                  <td>
                    <span className="admin-settings-notifications-channel">
                      {CHANNEL_ICONS[notification.channel]}
                      {t(`admin.settings.notifications.channels.${notification.channel}.label`)}
                    </span>
                  </td>
                  <td>
                    <span className="admin-settings-table-status" data-status={notification.status}>
                      <span className="admin-settings-table-status-dot" />
                      {t(`admin.settings.notifications.recent.status.${notification.status}`)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-settings-view-all">
        <button type="button" className="admin-settings-view-all-link" disabled aria-disabled="true">
          {t('admin.settings.notifications.recent.viewAll')}
          <img src={ARROW_RIGHT_ICON_URL} alt="" />
        </button>
      </div>
    </section>
  )
}
