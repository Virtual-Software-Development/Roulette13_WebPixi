import { useTranslation } from 'react-i18next'
import { CHANNEL_ICONS } from './notificationChannelIcons'
import type { NotificationChannelId, NotificationChannelsSettings } from '../../../types/adminSettings'
import './adminSettings.css'

const CHANNEL_ORDER: NotificationChannelId[] = ['email', 'discord', 'slack', 'webhook']

interface NotificationChannelsCardProps {
  channels: NotificationChannelsSettings
  onToggleChannel: (channel: NotificationChannelId) => void
}

// Solo estado de UI -- no existe todavía un backend de notificaciones (ver conversación, mismo
// criterio que System tab), así que activar/desactivar un canal no "guarda" nada en un servidor.
// La referencia solo muestra el formulario de Email Settings, ninguno para Discord/Slack/Webhook
// (pedido explícito de no inventar esos campos), así que activar esos tres canales aquí no revela
// ningún formulario adicional.
export function NotificationChannelsCard({ channels, onToggleChannel }: NotificationChannelsCardProps) {
  const { t } = useTranslation()

  return (
    <section className="admin-panel admin-settings-card">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">{t('admin.settings.notifications.channels.title')}</h2>
          <p className="admin-settings-card-subtitle">{t('admin.settings.notifications.channels.subtitle')}</p>
        </div>
      </div>

      <div className="admin-settings-channel-list">
        {CHANNEL_ORDER.map((channel) => (
          <div key={channel} className="admin-settings-channel-row">
            <span className="admin-settings-channel-icon">{CHANNEL_ICONS[channel]}</span>
            <div className="admin-settings-channel-body">
              <p className="admin-settings-channel-label">{t(`admin.settings.notifications.channels.${channel}.label`)}</p>
              <p className="admin-settings-channel-description">{t(`admin.settings.notifications.channels.${channel}.description`)}</p>
            </div>
            <label className="admin-settings-toggle">
              <input
                type="checkbox"
                className="admin-settings-toggle-input"
                checked={channels[channel]}
                onChange={() => onToggleChannel(channel)}
              />
              <span className="admin-settings-toggle-track">
                <span className="admin-settings-toggle-thumb" />
              </span>
            </label>
          </div>
        ))}
      </div>
    </section>
  )
}
