import { useTranslation } from 'react-i18next'
import { NOTIFICATION_EVENT_IDS } from '../../../data/adminSettingsMockData'
import type { NotificationEventsSettings } from '../../../types/adminSettings'
import './adminSettings.css'

interface NotificationEventsSectionProps {
  events: NotificationEventsSettings
  onToggleEvent: (event: keyof NotificationEventsSettings) => void
}

// Solo estado de UI (sin backend de notificaciones todavía) -- estos ids son
// descriptivos para el mock, no un enum real de eventos consumido por otra parte del sistema (ver
// types/adminSettings.ts: no existe todavía backend/store de notificaciones).
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
        {NOTIFICATION_EVENT_IDS.map((eventId) => (
          <label key={eventId} className="admin-settings-event-row">
            <span className="admin-settings-checkbox">
              <input
                type="checkbox"
                className="admin-settings-checkbox-input"
                checked={events[eventId]}
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
