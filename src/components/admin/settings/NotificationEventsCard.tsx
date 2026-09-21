import { useTranslation } from 'react-i18next'
import { NOTIFICATION_EVENT_IDS } from '../../../data/adminSettingsMockData'
import type { NotificationEventsSettings } from '../../../types/adminSettings'
import './adminSettings.css'

interface NotificationEventsCardProps {
  events: NotificationEventsSettings
  onToggleEvent: (event: keyof NotificationEventsSettings) => void
}

// Solo estado de UI (mismo criterio que NotificationChannelsCard.tsx) -- estos ids son
// descriptivos para el mock, no un enum real de eventos consumido por otra parte del sistema (ver
// types/adminSettings.ts: no existe todavía backend/store de notificaciones).
export function NotificationEventsCard({ events, onToggleEvent }: NotificationEventsCardProps) {
  const { t } = useTranslation()

  return (
    <section className="admin-panel admin-settings-card">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">{t('admin.settings.notifications.events.title')}</h2>
          <p className="admin-settings-card-subtitle">{t('admin.settings.notifications.events.subtitle')}</p>
        </div>
      </div>

      <div>
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
    </section>
  )
}
