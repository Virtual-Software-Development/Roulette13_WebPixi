import { useTranslation } from 'react-i18next'
import { AdminFormField } from '../AdminFormField'
import { buildMediaUrl } from '../../../utils/media'
import { FolderIcon } from './icons'
import type { VideoLibrarySettings } from '../../../types/adminSettings'
import './adminSettings.css'

// Logo real de marca (mismo que Login/Header/Betting Picker) -- pareja directa de
// QUICK_MONEY_ICON_URL, que ya usa el logo real "Quick Money" en vez de un ícono genérico.
const ROULETTE_ICON_URL = buildMediaUrl('Website_svg_icons/46_logo_option_2.svg')
const QUICK_MONEY_ICON_URL = buildMediaUrl('Website_svg_icons/43_quick-money-logo.svg')

interface VideoLibraryColumnProps {
  idPrefix: string
  icon: string
  title: string
  library: VideoLibrarySettings
  onChangePath: (value: string) => void
  onChangeMaxFileSize: (value: string) => void
}

// Sin backend de file-system real (no hay manera de que un admin web abra un explorador de
// carpetas del servidor) -- el botón de carpeta queda visible pero deshabilitado, mismo criterio ya
// establecido en ManualOverridesCard.tsx ("no inventar una ruta/funcionalidad nueva solo porque el
// botón aparece en la referencia").
function VideoLibraryColumn({ idPrefix, icon, title, library, onChangePath, onChangeMaxFileSize }: VideoLibraryColumnProps) {
  const { t } = useTranslation()

  return (
    <div className="admin-settings-video-column">
      <h3 className="admin-settings-video-column-title">
        <img src={icon} alt="" />
        {title}
      </h3>

      <div className="admin-settings-path-row">
        <AdminFormField
          id={`${idPrefix}-storage-path`}
          label={t('admin.settings.general.videoLibrary.defaultStoragePath')}
          value={library.defaultStoragePath}
          onChange={onChangePath}
        />
        <button type="button" className="admin-settings-browse-btn" disabled aria-label={t('admin.settings.general.videoLibrary.browseFolder')}>
          <FolderIcon />
        </button>
      </div>

      <AdminFormField
        id={`${idPrefix}-accepted-formats`}
        label={t('admin.settings.general.videoLibrary.acceptedFormats')}
        value={library.acceptedFormats}
        readOnly
      />

      <AdminFormField
        id={`${idPrefix}-max-file-size`}
        label={t('admin.settings.general.videoLibrary.maxFileSize')}
        type="number"
        min="1"
        suffix="MB"
        value={library.maxFileSizeMb}
        onChange={onChangeMaxFileSize}
      />
    </div>
  )
}

interface VideoLibrarySettingsCardProps {
  roulette: VideoLibrarySettings
  quickMoney: VideoLibrarySettings
  onChangeRoulettePath: (value: string) => void
  onChangeRouletteMaxFileSize: (value: string) => void
  onChangeQuickMoneyPath: (value: string) => void
  onChangeQuickMoneyMaxFileSize: (value: string) => void
}

export function VideoLibrarySettingsCard({
  roulette,
  quickMoney,
  onChangeRoulettePath,
  onChangeRouletteMaxFileSize,
  onChangeQuickMoneyPath,
  onChangeQuickMoneyMaxFileSize,
}: VideoLibrarySettingsCardProps) {
  const { t } = useTranslation()

  return (
    <section className="admin-panel admin-settings-card">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">{t('admin.settings.general.videoLibrary.title')}</h2>
          <p className="admin-settings-card-subtitle">{t('admin.settings.general.videoLibrary.subtitle')}</p>
        </div>
      </div>

      <div className="admin-settings-video-columns">
        <VideoLibraryColumn
          idPrefix="settings-roulette"
          icon={ROULETTE_ICON_URL}
          title={t('admin.settings.general.videoLibrary.rouletteVideos')}
          library={roulette}
          onChangePath={onChangeRoulettePath}
          onChangeMaxFileSize={onChangeRouletteMaxFileSize}
        />
        <div className="admin-settings-video-divider" aria-hidden="true" />
        <VideoLibraryColumn
          idPrefix="settings-quick-money"
          icon={QUICK_MONEY_ICON_URL}
          title={t('admin.settings.general.videoLibrary.quickMoneyVideos')}
          library={quickMoney}
          onChangePath={onChangeQuickMoneyPath}
          onChangeMaxFileSize={onChangeQuickMoneyMaxFileSize}
        />
      </div>
    </section>
  )
}
