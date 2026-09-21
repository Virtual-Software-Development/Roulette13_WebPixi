import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SiteInformationCard } from './SiteInformationCard'
import { VideoLibrarySettingsCard } from './VideoLibrarySettingsCard'
import { OtherSettingsCard } from './OtherSettingsCard'
import { buildMediaUrl } from '../../../utils/media'
import type { GeneralSettingsData, SettingsEnvironment } from '../../../types/adminSettings'
import './adminSettings.css'

const SAVE_ICON_URL = buildMediaUrl('Website_svg_icons/08_save_white.svg')
const RESET_ICON_URL = buildMediaUrl('Website_svg_icons/39_refresh_white_clean.svg')

// Mismos 3s que admin-next-results-feedback (nextResults.css) -- el feedback de éxito se retira
// solo, sin que el admin tenga que descartarlo a mano.
const SUCCESS_FEEDBACK_MS = 3000

interface GeneralSettingsTabProps {
  settings: GeneralSettingsData
  defaults: GeneralSettingsData
  onSave: (data: GeneralSettingsData) => void
}

// Mismo criterio dirty-check/reset que RtpSettingsPanel.tsx (draft local vs. `settings` ya
// guardado, Reset vuelve a `defaults` -- una base DISTINTA de "lo último guardado", ver
// adminSettingsMockData.ts) pero sin su paso de confirmación inline: a diferencia de RTP (que
// reconfigura el payout del juego), esta configuración general no amerita esa fricción extra --
// guardar es directo, con un feedback breve que se retira solo.
export function GeneralSettingsTab({ settings, defaults, onSave }: GeneralSettingsTabProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<GeneralSettingsData>(settings)
  const [showSavedFeedback, setShowSavedFeedback] = useState(false)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  useEffect(() => {
    if (!showSavedFeedback) return
    const timer = setTimeout(() => setShowSavedFeedback(false), SUCCESS_FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [showSavedFeedback])

  // JSON.stringify alcanza acá -- GeneralSettingsData es puramente serializable (sin funciones,
  // sin Date) y siempre se reconstruye con el mismo orden de keys (spread desde el mismo shape), así
  // que no hace falta un diff campo por campo como en RtpSettingsPanel (ese sí lo necesitaba por los
  // locked fields, que acá no existen).
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(settings)

  const handleSave = () => {
    onSave(draft)
    setShowSavedFeedback(true)
  }

  return (
    <div className="admin-settings-tab-content">
      <SiteInformationCard
        siteName={draft.siteName}
        environment={draft.environment}
        timezone={draft.timezone}
        defaultLanguage={draft.defaultLanguage}
        onChangeSiteName={(value) => setDraft((prev) => ({ ...prev, siteName: value }))}
        onChangeEnvironment={(value: SettingsEnvironment) => setDraft((prev) => ({ ...prev, environment: value }))}
        onChangeTimezone={(value) => setDraft((prev) => ({ ...prev, timezone: value }))}
        onChangeDefaultLanguage={(value) => setDraft((prev) => ({ ...prev, defaultLanguage: value }))}
      />

      <VideoLibrarySettingsCard
        roulette={draft.rouletteVideos}
        quickMoney={draft.quickMoneyVideos}
        onChangeRoulettePath={(value) => setDraft((prev) => ({ ...prev, rouletteVideos: { ...prev.rouletteVideos, defaultStoragePath: value } }))}
        onChangeRouletteMaxFileSize={(value) =>
          setDraft((prev) => ({ ...prev, rouletteVideos: { ...prev.rouletteVideos, maxFileSizeMb: Number(value) } }))
        }
        onChangeQuickMoneyPath={(value) =>
          setDraft((prev) => ({ ...prev, quickMoneyVideos: { ...prev.quickMoneyVideos, defaultStoragePath: value } }))
        }
        onChangeQuickMoneyMaxFileSize={(value) =>
          setDraft((prev) => ({ ...prev, quickMoneyVideos: { ...prev.quickMoneyVideos, maxFileSizeMb: Number(value) } }))
        }
      />

      <OtherSettingsCard
        itemsPerPage={draft.itemsPerPage}
        dateFormat={draft.dateFormat}
        enableAuditLog={draft.enableAuditLog}
        enableVideoProcessing={draft.enableVideoProcessing}
        maintenanceMode={draft.maintenanceMode}
        onChangeItemsPerPage={(value) => setDraft((prev) => ({ ...prev, itemsPerPage: Number(value) }))}
        onChangeDateFormat={(value) => setDraft((prev) => ({ ...prev, dateFormat: value }))}
        onToggleAuditLog={() => setDraft((prev) => ({ ...prev, enableAuditLog: !prev.enableAuditLog }))}
        onToggleVideoProcessing={() => setDraft((prev) => ({ ...prev, enableVideoProcessing: !prev.enableVideoProcessing }))}
        onToggleMaintenanceMode={() => setDraft((prev) => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
      />

      <div className="admin-settings-actions">
        {showSavedFeedback && <span className="admin-settings-save-feedback">{t('admin.settings.general.saveSuccess')}</span>}
        <button type="button" className="admin-settings-btn admin-settings-btn--ghost-strong" onClick={() => setDraft(defaults)}>
          <img src={RESET_ICON_URL} alt="" />
          {t('admin.settings.general.resetToDefaults')}
        </button>
        <button type="button" className="admin-settings-btn admin-settings-btn--primary" disabled={!hasChanges} onClick={handleSave}>
          <img src={SAVE_ICON_URL} alt="" />
          {t('admin.settings.general.saveChanges')}
        </button>
      </div>
    </div>
  )
}
