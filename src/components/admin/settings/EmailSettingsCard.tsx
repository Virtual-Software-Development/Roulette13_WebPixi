import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminFormField } from '../AdminFormField'
import { EnvelopeIcon } from './icons'
import { NotificationEventsSection } from './NotificationEventsSection'
import type { EmailNotificationSettings, NotificationEventsSettings } from '../../../types/adminSettings'
import './adminSettings.css'

// Sin backend real de envío de email (ver conversación) -- simula Sending.../success con un
// setTimeout, comentado explícitamente como mock. Feedback inline en el propio botón (el proyecto no
// tiene un sistema de toasts).
const ACTION_DURATION_MS = 700
const FEEDBACK_MS = 3000

type SendStatus = 'idle' | 'sending' | 'success'

function simulateSendTestEmail(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ACTION_DURATION_MS))
}

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
// Email (eliminados). Notification Events también vive acá, como columna derecha (pedido explícito).
export function EmailSettingsCard({
  enabled,
  onToggleEnabled,
  data,
  onChangeRecipients,
  events,
  onToggleEvent,
}: EmailSettingsCardProps) {
  const { t } = useTranslation()
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')

  useEffect(() => {
    if (sendStatus !== 'success') return
    const timer = setTimeout(() => setSendStatus('idle'), FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [sendStatus])

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

        {/* Send Test Email en la misma línea que Recipient(s) (ahorra una fila de alto). El label
            invisible arriba del botón replica la fila de label del campo, así el botón queda alineado
            con el input sin depender de una altura fija. */}
        <div className="admin-settings-recipients-row">
          <AdminFormField
            id="settings-recipients"
            label={t('admin.settings.notifications.email.recipients')}
            description={t('admin.settings.notifications.email.recipientsHelper')}
            value={data.recipients}
            onChange={onChangeRecipients}
          />
          <div className="admin-settings-recipients-action">
            <span className="admin-form-field-label" aria-hidden="true">
              &nbsp;
            </span>
            <button
              type="button"
              className="admin-settings-btn admin-settings-btn--ghost"
              disabled={sendStatus === 'sending'}
              onClick={() => {
                setSendStatus('sending')
                simulateSendTestEmail().then(() => setSendStatus('success'))
              }}
            >
              <EnvelopeIcon />
              {sendStatus === 'sending'
                ? t('admin.settings.notifications.email.sending')
                : sendStatus === 'success'
                  ? t('admin.settings.notifications.email.sentSuccess')
                  : t('admin.settings.notifications.email.sendTestEmail')}
            </button>
          </div>
        </div>
      </div>

      <NotificationEventsSection events={events} onToggleEvent={onToggleEvent} />
    </section>
  )
}
