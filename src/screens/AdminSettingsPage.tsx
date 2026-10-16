import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { applyAppLanguage } from '../i18n/applyLanguage'
import type { TFunction } from 'i18next'
import { AdminAuthError } from '../api/adminSession'
import { ConfirmDialog } from '../components/admin/ConfirmDialog'
import { EmailSettingsCard } from '../components/admin/settings/EmailSettingsCard'
import { GeneralSettingsCard } from '../components/admin/settings/GeneralSettingsCard'
import { useAdminSettings } from '../hooks/useAdminSettings'
import { buildMediaUrl } from '../utils/media'
import type { AdminSettingsData, GeneralSettingsData, NotificationEventsSettings } from '../types/adminSettings'
import '../components/admin/settings/adminSettings.css'

const SAVE_ICON_URL = buildMediaUrl('Website_svg_icons/08_save_white.svg')
const RESET_ICON_URL = buildMediaUrl('Website_svg_icons/39_refresh_white_clean.svg')

// Mismos 3s que admin-next-results-feedback (nextResults.css) -- el feedback de éxito se retira
// solo, sin que el admin tenga que descartarlo a mano. El de error queda hasta el próximo Save.
const SUCCESS_FEEDBACK_MS = 3000

type Feedback = { variant: 'success' | 'error'; message: string }

// JSON.stringify alcanza acá -- AdminSettingsData es puramente serializable (sin funciones, sin
// Date) y siempre se reconstruye con el mismo orden de keys (spread desde el mismo shape).
function isSameSettings(a: AdminSettingsData, b: AdminSettingsData) {
  return JSON.stringify(a) === JSON.stringify(b)
}

// Sin sesión de admin el backend responde 401 (AdminAuthError); el resto trae el mensaje del
// backend (apperror, en español) o el status.
function errorDetail(err: unknown): string {
  return err instanceof Error && err.message ? err.message : String(err)
}

function errorMessage(err: unknown, key: 'loadError' | 'saveError', t: TFunction): string {
  if (err instanceof AdminAuthError) return t('admin.settings.errors.login')
  return t(`admin.settings.${key}`, { error: errorDetail(err) })
}

// Contenido puro (sin Header/Sidebar propios, ver AdminDashboardPage.tsx). Una sola página con un
// único Save/Reset para TODO (General + Notifications, pedido explícito): todo es draft hasta Save
// Changes, que manda la página entera a PUT /admin-settings. Reset vuelve el draft a los defaults
// del backend previa confirmación -- sigue sin aplicar nada hasta Save. Los destinatarios no tienen
// default (son datos, no una opción), así que Reset los conserva.
export function AdminSettingsPage() {
  const { t } = useTranslation()
  const { status, snapshot, error, reload, save } = useAdminSettings()
  // null = sin cambios sobre lo guardado.
  const [edits, setEdits] = useState<AdminSettingsData | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)

  useEffect(() => {
    if (feedback?.variant !== 'success') return
    const timer = setTimeout(() => setFeedback(null), SUCCESS_FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [feedback])

  const header = (
    <div className="admin-main-topbar">
      <div>
        <h1 className="admin-main-title">{t('admin.settings.title')}</h1>
        <p className="admin-main-subtitle">{t('admin.settings.subtitle')}</p>
      </div>
      {feedback && (
        <div
          className={`admin-settings-save-feedback${feedback.variant === 'error' ? ' admin-settings-save-feedback--error' : ''}`}
          role={feedback.variant === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </div>
      )}
    </div>
  )

  if (!snapshot) {
    return (
      <>
        {header}
        {status === 'error' ? (
          <p className="admin-settings-notice" data-variant="error" role="alert">
            {errorMessage(error, 'loadError', t)}
            <button type="button" className="admin-settings-btn admin-settings-btn--ghost" onClick={() => void reload()}>
              {t('admin.settings.retry')}
            </button>
          </p>
        ) : (
          <p className="admin-settings-notice" role="status">
            {t('admin.settings.loading')}
          </p>
        )}
      </>
    )
  }

  const saved = snapshot.current
  const draft = edits ?? saved
  const resetTarget: AdminSettingsData = { ...snapshot.defaults, emailNotifications: draft.emailNotifications }
  const hasChanges = !isSameSettings(draft, saved)
  const isAtDefaults = isSameSettings(draft, resetTarget)

  const edit = (update: (prev: AdminSettingsData) => AdminSettingsData) => setEdits((prev) => update(prev ?? saved))

  const updateGeneral = (patch: Partial<GeneralSettingsData>) => edit((prev) => ({ ...prev, general: { ...prev.general, ...patch } }))

  const toggleEvent = (event: keyof NotificationEventsSettings) =>
    edit((prev) => ({ ...prev, notificationEvents: { ...prev.notificationEvents, [event]: !prev.notificationEvents[event] } }))

  const handleSave = async () => {
    setSaving(true)
    setFeedback(null)
    try {
      await save(draft)
      // El panel cambia de idioma en cuanto se guarda uno nuevo.
      applyAppLanguage(draft.general.adminLanguage)
      setEdits(null)
      setFeedback({ variant: 'success', message: t('admin.settings.saveSuccess') })
    } catch (err) {
      setFeedback({ variant: 'error', message: errorMessage(err, 'saveError', t) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {header}

      <div className="admin-settings-tab-content">
        <GeneralSettingsCard
          timezone={draft.general.timezone}
          defaultLanguage={draft.general.defaultLanguage}
          adminLanguage={draft.general.adminLanguage}
          itemsPerPage={draft.general.itemsPerPage}
          dateFormat={draft.general.dateFormat}
          maintenanceMode={draft.general.maintenanceMode}
          onChangeTimezone={(value) => updateGeneral({ timezone: value })}
          onChangeDefaultLanguage={(value) => updateGeneral({ defaultLanguage: value })}
          onChangeAdminLanguage={(value) => updateGeneral({ adminLanguage: value })}
          onChangeItemsPerPage={(value) => updateGeneral({ itemsPerPage: Number(value) })}
          onChangeDateFormat={(value) => updateGeneral({ dateFormat: value })}
          onToggleMaintenanceMode={() => updateGeneral({ maintenanceMode: !draft.general.maintenanceMode })}
        />

        <EmailSettingsCard
          enabled={draft.notificationChannels.email}
          onToggleEnabled={() =>
            edit((prev) => ({ ...prev, notificationChannels: { ...prev.notificationChannels, email: !prev.notificationChannels.email } }))
          }
          data={draft.emailNotifications}
          onChangeRecipients={(value) => edit((prev) => ({ ...prev, emailNotifications: { ...prev.emailNotifications, recipients: value } }))}
          events={draft.notificationEvents}
          onToggleEvent={toggleEvent}
        />

        <div className="admin-settings-actions">
          <button
            type="button"
            className="admin-settings-btn admin-settings-btn--ghost"
            disabled={isAtDefaults || saving}
            onClick={() => setConfirmingReset(true)}
          >
            <img src={RESET_ICON_URL} alt="" />
            {t('admin.settings.resetToDefaults')}
          </button>
          <button
            type="button"
            className="admin-settings-btn admin-settings-btn--primary"
            disabled={!hasChanges || saving}
            onClick={() => void handleSave()}
          >
            <img src={SAVE_ICON_URL} alt="" />
            {saving ? t('admin.settings.saving') : t('admin.settings.saveChanges')}
          </button>
        </div>
      </div>

      {confirmingReset && (
        <ConfirmDialog
          warning
          title={t('admin.settings.resetConfirm.title')}
          description={t('admin.settings.resetConfirm.description')}
          cancelLabel={t('admin.settings.resetConfirm.cancel')}
          confirmLabel={t('admin.settings.resetConfirm.confirm')}
          onCancel={() => setConfirmingReset(false)}
          onConfirm={() => {
            setEdits(resetTarget)
            setConfirmingReset(false)
          }}
        />
      )}
    </>
  )
}
