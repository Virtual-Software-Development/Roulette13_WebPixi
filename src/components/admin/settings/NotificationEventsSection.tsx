import { useTranslation } from 'react-i18next'
import { NOTIFICATION_EVENT_IDS } from './settingsOptions'
import type { NotificationEventsSettings } from '../../../types/adminSettings'
import './adminSettings.css'

interface NotificationEventsSectionProps {
  events: NotificationEventsSettings
  onToggleEvent: (event: keyof NotificationEventsSettings) => void
}

// Cada id es un notification_event_type del backend; solo se listan los que el backend devolvió.
// Ya no es una card propia: vive como columna derecha dentro de EmailSettingsCard (pedido explícito
// de fusionar Email Notifications + Notification Events).
export function NotificationEventsSection({ events, onToggleEvent }: NotificationEventsSectionProps) {
  const { t } = useTranslation()

  return (
    <div className="admin-settings-events-section">
      <div>
        <h3 className="admin-settings-subsection-title">{t('admin.settings.notifications.events.title')}</h3>
        <p className="admin-settings-card-subtitle">{t('admin.settings.notifications.events.subtitle')}</p>
      </div>

      <div className="admin-settings-events-list">
        {NOTIFICATION_EVENT_IDS.filter((eventId) => events[eventId] !== undefined).map((eventId) => (
          <label key={eventId} className="admin-settings-event-row">
            <span className="admin-settings-checkbox">
              <input
                type="checkbox"
                className="admin-settings-checkbox-input"
                checked={events[eventId] === true}
                onChange={() => onToggleEvent(eventId)}
              />
              <span className="admin-settings-checkbox-box" aria-hidden="true" />
            </span>
            <span className="admin-settings-event-label">{t(`admin.settings.notifications.events.items.${eventId}`)}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
