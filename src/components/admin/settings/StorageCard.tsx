import { useTranslation } from 'react-i18next'
import { AdminFormField } from '../AdminFormField'
import { FolderIcon } from './icons'
import type { SystemStorageSettings } from '../../../types/adminSettings'
import './adminSettings.css'

interface StorageCardProps {
  data: SystemStorageSettings
  onChangeBaseDataPath: (value: string) => void
  onChangeVideosPath: (value: string) => void
  onChangeLogsPath: (value: string) => void
  onChangeMaxLogFileSize: (value: string) => void
  onChangeKeepLogsFor: (value: string) => void
}

// Los tres botones de carpeta y "Open in File Explorer" quedan visibles pero deshabilitados --
// esta app corre exclusivamente en el navegador (sin Electron/Tauri, confirmado por investigación),
// así que no hay manera real de abrir un explorador de archivos del sistema operativo desde acá.
// Mismo criterio ya establecido en VideoLibrarySettingsCard.tsx (Game Events) y en el propio tab
// General de esta misma pantalla.
export function StorageCard({
  data,
  onChangeBaseDataPath,
  onChangeVideosPath,
  onChangeLogsPath,
  onChangeMaxLogFileSize,
  onChangeKeepLogsFor,
}: StorageCardProps) {
  const { t } = useTranslation()

  return (
    <section className="admin-panel admin-settings-card">
      <div className="admin-panel-header">
        <div className="admin-settings-card-heading">
          <span className="admin-settings-card-heading-icon admin-settings-card-heading-icon--inline">
            <FolderIcon />
          </span>
          <div>
            <h2 className="admin-panel-title">{t('admin.settings.system.storage.title')}</h2>
            <p className="admin-settings-card-subtitle">{t('admin.settings.system.storage.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="admin-settings-path-row">
        <AdminFormField
          id="settings-base-data-path"
          label={t('admin.settings.system.storage.baseDataPath')}
          value={data.baseDataPath}
          onChange={onChangeBaseDataPath}
        />
        <button type="button" className="admin-settings-browse-btn" disabled aria-label={t('admin.settings.system.storage.browseFolder')}>
          <FolderIcon />
        </button>
      </div>

      <div className="admin-settings-path-row">
        <AdminFormField
          id="settings-videos-path"
          label={t('admin.settings.system.storage.videosPath')}
          value={data.videosPath}
          onChange={onChangeVideosPath}
        />
        <button type="button" className="admin-settings-browse-btn" disabled aria-label={t('admin.settings.system.storage.browseFolder')}>
          <FolderIcon />
        </button>
      </div>

      <div className="admin-settings-path-row">
        <AdminFormField
          id="settings-logs-path"
          label={t('admin.settings.system.storage.logsPath')}
          value={data.logsPath}
          onChange={onChangeLogsPath}
        />
        <button type="button" className="admin-settings-browse-btn" disabled aria-label={t('admin.settings.system.storage.browseFolder')}>
          <FolderIcon />
        </button>
      </div>

      <div className="admin-settings-row">
        <AdminFormField
          id="settings-max-log-size"
          label={t('admin.settings.system.storage.maxLogFileSize')}
          type="number"
          min="1"
          suffix="MB"
          value={data.maxLogFileSizeMb}
          onChange={onChangeMaxLogFileSize}
        />
        <AdminFormField
          id="settings-keep-logs-for"
          label={t('admin.settings.system.storage.keepLogsFor')}
          type="number"
          min="1"
          suffix={t('admin.settings.system.storage.days')}
          value={data.keepLogsForDays}
          onChange={onChangeKeepLogsFor}
        />
      </div>

      <button type="button" className="admin-settings-btn admin-settings-btn--ghost admin-settings-btn--full" disabled>
        <FolderIcon />
        {t('admin.settings.system.storage.openInFileExplorer')}
      </button>
    </section>
  )
}
