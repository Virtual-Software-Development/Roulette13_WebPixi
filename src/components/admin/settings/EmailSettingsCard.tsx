import { useTranslation } from 'react-i18next'
import { AdminFormField } from '../AdminFormField'
import { EnvelopeIcon } from './icons'
import { NotificationEventsSection } from './NotificationEventsSection'
import type { EmailNotificationSettings, NotificationEventsSettings } from '../../../types/adminSettings'
import './adminSettings.css'

interface EmailSettingsCardProps {
  enabled: boolean
  onToggleEnabled: () => void
  data: EmailNotificationSettings
  onChangeRecipients: (value: string) => void
  events: NotificationEventsSettings
  onToggleEvent: (event: keyof NotificationEventsSettings) => void
}

// Única card de canal del tab Notifications -- combina las antiguas Notification Channels y Email
// Settings (pedido explícito): Email es el único canal (Discord/Slack/Webhook eliminados), así que
// su toggle encabeza la card y Recipient(s) va debajo. Sin SMTP Server/Port/Username/Password/From
// Email (eliminados) ni Send Test Email (el backend todavía no envía emails). Notification Events
// también vive acá, como columna derecha (pedido explícito).
export function EmailSettingsCard({
  enabled,
  onToggleEnabled,
  data,
  onChangeRecipients,
  events,
  onToggleEvent,
}: EmailSettingsCardProps) {
  const { t } = useTranslation()

  return (
    <section className="admin-panel admin-settings-card admin-settings-card--email">
      <div className="admin-settings-email-main">
        <div className="admin-panel-header">
          <div>
            <h2 className="admin-panel-title">{t('admin.settings.notifications.email.title')}</h2>
            <p className="admin-settings-card-subtitle">{t('admin.settings.notifications.email.subtitle')}</p>
          </div>
        </div>

        <div className="admin-settings-channel-row">
          <span className="admin-settings-channel-icon">
            <EnvelopeIcon />
          </span>
          <div className="admin-settings-channel-body">
            <p className="admin-settings-channel-label">{t('admin.settings.notifications.channels.email.label')}</p>
            <p className="admin-settings-channel-description">{t('admin.settings.notifications.channels.email.description')}</p>
          </div>
          <label className="admin-settings-toggle">
            <input type="checkbox" className="admin-settings-toggle-input" checked={enabled} onChange={onToggleEnabled} />
            <span className="admin-settings-toggle-track">
              <span className="admin-settings-toggle-thumb" />
            </span>
          </label>
        </div>

        <AdminFormField
          id="settings-recipients"
          label={t('admin.settings.notifications.email.recipients')}
          description={t('admin.settings.notifications.email.recipientsHelper')}
          value={data.recipients}
          onChange={onChangeRecipients}
        />
      </div>

      <NotificationEventsSection events={events} onToggleEvent={onToggleEvent} />
    </section>
  )
}
