import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminFormField } from '../AdminFormField'
import { EnvelopeIcon, EyeIcon, EyeOffIcon } from './icons'
import type { EmailNotificationSettings } from '../../../types/adminSettings'
import './adminSettings.css'

// Mismo criterio mock que DatabaseCard.tsx (sin backend real de envío de email, ver conversación)
// -- simula Sending.../success con un setTimeout, comentado explícitamente como mock. No existe
// todavía un sistema de toasts en el proyecto (los flujos de feedback existentes son siempre
// inline -- ver RouletteNextResultPanel/DatabaseCard), así que este botón sigue ese mismo patrón
// en vez de inventar un toast nuevo.
const ACTION_DURATION_MS = 700
const FEEDBACK_MS = 3000

type SendStatus = 'idle' | 'sending' | 'success'

function simulateSendTestEmail(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ACTION_DURATION_MS))
}

interface EmailSettingsCardProps {
  data: EmailNotificationSettings
  onChangeSmtpServer: (value: string) => void
  onChangePort: (value: string) => void
  onChangeUsername: (value: string) => void
  onChangePassword: (value: string) => void
  onChangeFromEmail: (value: string) => void
  onChangeRecipients: (value: string) => void
}

export function EmailSettingsCard({
  data,
  onChangeSmtpServer,
  onChangePort,
  onChangeUsername,
  onChangePassword,
  onChangeFromEmail,
  onChangeRecipients,
}: EmailSettingsCardProps) {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')

  useEffect(() => {
    if (sendStatus !== 'success') return
    const timer = setTimeout(() => setSendStatus('idle'), FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [sendStatus])

  return (
    <section className="admin-panel admin-settings-card">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">{t('admin.settings.notifications.email.title')}</h2>
          <p className="admin-settings-card-subtitle">{t('admin.settings.notifications.email.subtitle')}</p>
        </div>
      </div>

      <div className="admin-settings-smtp-port-row">
        <AdminFormField
          id="settings-smtp-server"
          label={t('admin.settings.notifications.email.smtpServer')}
          value={data.smtpServer}
          onChange={onChangeSmtpServer}
        />
        <AdminFormField id="settings-smtp-port" label={t('admin.settings.notifications.email.port')} value={data.port} onChange={onChangePort} />
      </div>

      <AdminFormField
        id="settings-smtp-username"
        label={t('admin.settings.notifications.email.username')}
        value={data.username}
        onChange={onChangeUsername}
      />

      <AdminFormField
        id="settings-smtp-password"
        label={t('admin.settings.notifications.email.password')}
        type={showPassword ? 'text' : 'password'}
        value={data.password}
        onChange={onChangePassword}
        suffix={
          <button
            type="button"
            className="admin-settings-eye-btn"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? t('admin.settings.notifications.email.hidePassword') : t('admin.settings.notifications.email.showPassword')}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
      />

      <AdminFormField
        id="settings-from-email"
        label={t('admin.settings.notifications.email.fromEmail')}
        value={data.fromEmail}
        onChange={onChangeFromEmail}
      />

      <AdminFormField
        id="settings-recipients"
        label={t('admin.settings.notifications.email.recipients')}
        description={t('admin.settings.notifications.email.recipientsHelper')}
        value={data.recipients}
        onChange={onChangeRecipients}
      />

      {/* div block (no flex) para que el botón conserve su ancho por contenido -- .admin-settings-card
          es flex-column con align-items:stretch por defecto, así que sin este wrapper el botón se
          estiraría al 100% (pedido explícito: no debe ocupar todo el ancho, y va al inicio, no a la
          derecha como .admin-settings-actions, usado por Save/Reset). */}
      <div>
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
    </section>
  )
}
