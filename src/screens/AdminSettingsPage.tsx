import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../components/admin/ConfirmDialog'
import { EmailSettingsCard } from '../components/admin/settings/EmailSettingsCard'
import { GeneralSettingsCard } from '../components/admin/settings/GeneralSettingsCard'
import { DEFAULT_ADMIN_SETTINGS } from '../data/adminSettingsMockData'
import { buildMediaUrl } from '../utils/media'
import type { AdminSettingsData, GeneralSettingsData, NotificationEventsSettings } from '../types/adminSettings'
import '../components/admin/settings/adminSettings.css'

const SAVE_ICON_URL = buildMediaUrl('Website_svg_icons/08_save_white.svg')
const RESET_ICON_URL = buildMediaUrl('Website_svg_icons/39_refresh_white_clean.svg')

// Mismos 3s que admin-next-results-feedback (nextResults.css) -- el feedback de éxito se retira
// solo, sin que el admin tenga que descartarlo a mano.
const SUCCESS_FEEDBACK_MS = 3000

// JSON.stringify alcanza acá -- AdminSettingsData es puramente serializable (sin funciones, sin
// Date) y siempre se reconstruye con el mismo orden de keys (spread desde el mismo shape).
function isSameSettings(a: AdminSettingsData, b: AdminSettingsData) {
  return JSON.stringify(a) === JSON.stringify(b)
}

// Contenido puro (sin Header/Sidebar propios, ver AdminDashboardPage.tsx). Una sola página con un
// único Save/Reset para TODO (General + Notifications, pedido explícito): antes General tenía su
// propio Save mientras que Notifications aplicaba cada cambio al instante, y los botones flotando
// entre ambas cards no dejaban claro qué cubrían. Ahora todo es draft hasta Save Changes, y los
// botones van al final de la página. Reset vuelve el draft a los defaults (una base DISTINTA de "lo
// último guardado", ver adminSettingsMockData.ts) previa confirmación -- sigue sin aplicar nada
// hasta Save.
export function AdminSettingsPage() {
  const { t } = useTranslation()
  const [saved, setSaved] = useState<AdminSettingsData>(DEFAULT_ADMIN_SETTINGS)
  const [draft, setDraft] = useState<AdminSettingsData>(DEFAULT_ADMIN_SETTINGS)
  const [showSavedFeedback, setShowSavedFeedback] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)

  useEffect(() => {
    if (!showSavedFeedback) return
    const timer = setTimeout(() => setShowSavedFeedback(false), SUCCESS_FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [showSavedFeedback])

  const hasChanges = !isSameSettings(draft, saved)
  const isAtDefaults = isSameSettings(draft, DEFAULT_ADMIN_SETTINGS)

  const updateGeneral = (patch: Partial<GeneralSettingsData>) => setDraft((prev) => ({ ...prev, general: { ...prev.general, ...patch } }))

  const toggleEvent = (event: keyof NotificationEventsSettings) =>
    setDraft((prev) => ({ ...prev, notificationEvents: { ...prev.notificationEvents, [event]: !prev.notificationEvents[event] } }))

  const handleSave = () => {
    setSaved(draft)
    setShowSavedFeedback(true)
  }

  return (
    <>
      <div className="admin-main-topbar">
        <div>
          <h1 className="admin-main-title">{t('admin.settings.title')}</h1>
          <p className="admin-main-subtitle">{t('admin.settings.subtitle')}</p>
        </div>
        {showSavedFeedback && (
          <div className="admin-settings-save-feedback" role="status">
            {t('admin.settings.saveSuccess')}
          </div>
        )}
      </div>

      <div className="admin-settings-tab-content">
        <GeneralSettingsCard
          timezone={draft.general.timezone}
          defaultLanguage={draft.general.defaultLanguage}
          itemsPerPage={draft.general.itemsPerPage}
          dateFormat={draft.general.dateFormat}
          maintenanceMode={draft.general.maintenanceMode}
          onChangeTimezone={(value) => updateGeneral({ timezone: value })}
          onChangeDefaultLanguage={(value) => updateGeneral({ defaultLanguage: value })}
          onChangeItemsPerPage={(value) => updateGeneral({ itemsPerPage: Number(value) })}
          onChangeDateFormat={(value) => updateGeneral({ dateFormat: value })}
          onToggleMaintenanceMode={() => updateGeneral({ maintenanceMode: !draft.general.maintenanceMode })}
        />

        <EmailSettingsCard
          enabled={draft.notificationChannels.email}
          onToggleEnabled={() =>
            setDraft((prev) => ({ ...prev, notificationChannels: { ...prev.notificationChannels, email: !prev.notificationChannels.email } }))
          }
          data={draft.emailNotifications}
          onChangeRecipients={(value) => setDraft((prev) => ({ ...prev, emailNotifications: { ...prev.emailNotifications, recipients: value } }))}
          events={draft.notificationEvents}
          onToggleEvent={toggleEvent}
        />

        <div className="admin-settings-actions">
          <button
            type="button"
            className="admin-settings-btn admin-settings-btn--ghost"
            disabled={isAtDefaults}
            onClick={() => setConfirmingReset(true)}
          >
            <img src={RESET_ICON_URL} alt="" />
            {t('admin.settings.resetToDefaults')}
          </button>
          <button type="button" className="admin-settings-btn admin-settings-btn--primary" disabled={!hasChanges} onClick={handleSave}>
            <img src={SAVE_ICON_URL} alt="" />
            {t('admin.settings.saveChanges')}
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
            setDraft(DEFAULT_ADMIN_SETTINGS)
            setConfirmingReset(false)
          }}
        />
      )}
    </>
  )
}
