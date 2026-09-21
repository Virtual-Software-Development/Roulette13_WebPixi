import { useState } from 'react'
import { NotificationChannelsCard } from './NotificationChannelsCard'
import { EmailSettingsCard } from './EmailSettingsCard'
import { NotificationEventsCard } from './NotificationEventsCard'
import { RecentNotificationsCard } from './RecentNotificationsCard'
import {
  DEFAULT_EMAIL_NOTIFICATION_SETTINGS,
  DEFAULT_NOTIFICATION_CHANNELS,
  DEFAULT_NOTIFICATION_EVENTS,
  RECENT_NOTIFICATIONS,
} from '../../../data/adminSettingsMockData'
import type { EmailNotificationSettings, NotificationChannelId, NotificationChannelsSettings, NotificationEventsSettings } from '../../../types/adminSettings'
import './adminSettings.css'

// Igual que System tab (ver ese archivo) -- sin Save/Reset explícito, los cambios viven directo en
// este estado. A diferencia de System, acá no hay Danger Zone/Factory Reset: nada de esto es una
// configuración lo bastante crítica como para necesitar ese mecanismo (confirmado por la
// referencia, que no muestra ningún botón de guardado para este tab).
export function NotificationsTab() {
  const [channels, setChannels] = useState<NotificationChannelsSettings>(DEFAULT_NOTIFICATION_CHANNELS)
  const [email, setEmail] = useState<EmailNotificationSettings>(DEFAULT_EMAIL_NOTIFICATION_SETTINGS)
  const [events, setEvents] = useState<NotificationEventsSettings>(DEFAULT_NOTIFICATION_EVENTS)
  const [notifications, setNotifications] = useState(RECENT_NOTIFICATIONS)

  const toggleChannel = (channel: NotificationChannelId) => setChannels((prev) => ({ ...prev, [channel]: !prev[channel] }))
  const toggleEvent = (event: keyof NotificationEventsSettings) => setEvents((prev) => ({ ...prev, [event]: !prev[event] }))

  return (
    <div className="admin-settings-tab-content">
      <div className="admin-settings-row admin-settings-row--notification-channels">
        <NotificationChannelsCard channels={channels} onToggleChannel={toggleChannel} />
        <EmailSettingsCard
          data={email}
          onChangeSmtpServer={(value) => setEmail((prev) => ({ ...prev, smtpServer: value }))}
          onChangePort={(value) => setEmail((prev) => ({ ...prev, port: value }))}
          onChangeUsername={(value) => setEmail((prev) => ({ ...prev, username: value }))}
          onChangePassword={(value) => setEmail((prev) => ({ ...prev, password: value }))}
          onChangeFromEmail={(value) => setEmail((prev) => ({ ...prev, fromEmail: value }))}
          onChangeRecipients={(value) => setEmail((prev) => ({ ...prev, recipients: value }))}
        />
      </div>

      <div className="admin-settings-row admin-settings-row--notification-events">
        <NotificationEventsCard events={events} onToggleEvent={toggleEvent} />
        <RecentNotificationsCard notifications={notifications} onRefresh={() => setNotifications(RECENT_NOTIFICATIONS)} />
      </div>
    </div>
  )
}
