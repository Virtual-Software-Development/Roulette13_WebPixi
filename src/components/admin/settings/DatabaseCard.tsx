import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminFormField } from '../AdminFormField'
import { AdminSelect, type AdminSelectOption } from '../AdminSelect'
import { buildMediaUrl } from '../../../utils/media'
import { DATABASE_TYPE_OPTIONS } from '../../../data/adminSettingsMockData'
import { EyeIcon, EyeOffIcon } from './icons'
import type { DatabaseType, SystemDatabaseSettings } from '../../../types/adminSettings'
import './adminSettings.css'

const DATABASE_ICON_URL = buildMediaUrl('Website_svg_icons/42_database.svg')
const REFRESH_ICON_URL = buildMediaUrl('Website_svg_icons/39_refresh_white_clean.svg')

// No hay backend real de base de datos (ver conversación) -- estas dos acciones simulan el flujo
// visual Testing.../Backing up... -> success con un setTimeout, mismo criterio ya establecido en
// RouletteNextResultPanel.performUpdate (comentario ahí: "no existe todavía un endpoint real de
// escritura... esta función demuestra el flujo"). Reemplazar el cuerpo por el fetch real no
// requiere tocar el resto del componente.
const ACTION_DURATION_MS = 700
const FEEDBACK_MS = 3000

type ActionStatus = 'idle' | 'running' | 'success'

function simulateAction(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ACTION_DURATION_MS))
}

interface DatabaseCardProps {
  data: SystemDatabaseSettings
  onChangeDatabaseType: (value: DatabaseType) => void
  onChangeHost: (value: string) => void
  onChangePort: (value: string) => void
  onChangeDatabaseName: (value: string) => void
  onChangeUsername: (value: string) => void
  onChangePassword: (value: string) => void
}

export function DatabaseCard({
  data,
  onChangeDatabaseType,
  onChangeHost,
  onChangePort,
  onChangeDatabaseName,
  onChangeUsername,
  onChangePassword,
}: DatabaseCardProps) {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  const [testStatus, setTestStatus] = useState<ActionStatus>('idle')
  const [backupStatus, setBackupStatus] = useState<ActionStatus>('idle')

  useEffect(() => {
    if (testStatus !== 'success') return
    const timer = setTimeout(() => setTestStatus('idle'), FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [testStatus])

  useEffect(() => {
    if (backupStatus !== 'success') return
    const timer = setTimeout(() => setBackupStatus('idle'), FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [backupStatus])

  const databaseTypeOptions: AdminSelectOption<DatabaseType>[] = DATABASE_TYPE_OPTIONS.map((value) => ({
    value,
    label: t(`admin.settings.system.database.typeOptions.${value}`),
  }))

  return (
    <section className="admin-panel admin-settings-card">
      <div className="admin-panel-header">
        <div className="admin-settings-card-heading">
          <img src={DATABASE_ICON_URL} className="admin-settings-card-heading-icon" alt="" />
          <div>
            <h2 className="admin-panel-title">{t('admin.settings.system.database.title')}</h2>
            <p className="admin-settings-card-subtitle">{t('admin.settings.system.database.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="admin-settings-status-inline">
        <span className="admin-settings-status-label">{t('admin.settings.system.database.connectionStatus')}</span>
        <span className="admin-settings-status-value">
          <span className="admin-settings-status-dot" data-status={data.connectionStatus} />
          {t(`admin.settings.system.database.connectionStatusValues.${data.connectionStatus}`)}
        </span>
      </div>

      <AdminSelect
        value={data.databaseType}
        options={databaseTypeOptions}
        onChange={onChangeDatabaseType}
        label={t('admin.settings.system.database.databaseType')}
      />

      <div className="admin-settings-host-port-row">
        <AdminFormField id="settings-db-host" label={t('admin.settings.system.database.host')} value={data.host} onChange={onChangeHost} />
        <AdminFormField id="settings-db-port" label={t('admin.settings.system.database.port')} value={data.port} onChange={onChangePort} />
      </div>

      <AdminFormField
        id="settings-db-name"
        label={t('admin.settings.system.database.databaseName')}
        value={data.databaseName}
        onChange={onChangeDatabaseName}
      />

      <AdminFormField
        id="settings-db-username"
        label={t('admin.settings.system.database.username')}
        value={data.username}
        onChange={onChangeUsername}
      />

      <AdminFormField
        id="settings-db-password"
        label={t('admin.settings.system.database.password')}
        type={showPassword ? 'text' : 'password'}
        value={data.password}
        onChange={onChangePassword}
        suffix={
          <button
            type="button"
            className="admin-settings-eye-btn"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? t('admin.settings.system.database.hidePassword') : t('admin.settings.system.database.showPassword')}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
      />

      <div className="admin-settings-actions admin-settings-actions--split">
        <button
          type="button"
          className="admin-settings-btn admin-settings-btn--ghost"
          disabled={testStatus === 'running'}
          onClick={() => {
            setTestStatus('running')
            simulateAction().then(() => setTestStatus('success'))
          }}
        >
          <img src={DATABASE_ICON_URL} alt="" />
          {testStatus === 'running'
            ? t('admin.settings.system.database.testing')
            : testStatus === 'success'
              ? t('admin.settings.system.database.connectedSuccess')
              : t('admin.settings.system.database.testConnection')}
        </button>
        <button
          type="button"
          className="admin-settings-btn admin-settings-btn--ghost"
          disabled={backupStatus === 'running'}
          onClick={() => {
            setBackupStatus('running')
            simulateAction().then(() => setBackupStatus('success'))
          }}
        >
          <img src={REFRESH_ICON_URL} alt="" />
          {backupStatus === 'running'
            ? t('admin.settings.system.database.backingUp')
            : backupStatus === 'success'
              ? t('admin.settings.system.database.backupSuccess')
              : t('admin.settings.system.database.backupDatabase')}
        </button>
      </div>
    </section>
  )
}
