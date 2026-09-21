import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminFormField } from '../AdminFormField'
import { AdminSelect, type AdminSelectOption } from '../AdminSelect'
import { DATE_FORMAT_OPTIONS } from '../../../data/adminSettingsMockData'
import './adminSettings.css'

interface ToggleRowProps {
  checked: boolean
  onChange: () => void
  label: string
  description: string
}

function ToggleRow({ checked, onChange, label, description }: ToggleRowProps) {
  return (
    <div className="admin-settings-toggle-row">
      <label className="admin-settings-toggle">
        <input type="checkbox" className="admin-settings-toggle-input" checked={checked} onChange={onChange} />
        <span className="admin-settings-toggle-track">
          <span className="admin-settings-toggle-thumb" />
        </span>
      </label>
      <div>
        <p className="admin-settings-toggle-label">{label}</p>
        <p className="admin-settings-toggle-description">{description}</p>
      </div>
    </div>
  )
}

interface OtherSettingsCardProps {
  itemsPerPage: number
  dateFormat: string
  enableAuditLog: boolean
  enableVideoProcessing: boolean
  maintenanceMode: boolean
  onChangeItemsPerPage: (value: string) => void
  onChangeDateFormat: (value: string) => void
  onToggleAuditLog: () => void
  onToggleVideoProcessing: () => void
  onToggleMaintenanceMode: () => void
}

export function OtherSettingsCard({
  itemsPerPage,
  dateFormat,
  enableAuditLog,
  enableVideoProcessing,
  maintenanceMode,
  onChangeItemsPerPage,
  onChangeDateFormat,
  onToggleAuditLog,
  onToggleVideoProcessing,
  onToggleMaintenanceMode,
}: OtherSettingsCardProps) {
  const { t } = useTranslation()

  // Patrón de formato ya formateado (dato, no copy de UI, ver adminSettingsMockData.ts) -- value y
  // label son el mismo string.
  const dateFormatOptions: AdminSelectOption<string>[] = useMemo(() => DATE_FORMAT_OPTIONS.map((value) => ({ value, label: value })), [])

  return (
    <section className="admin-panel admin-settings-card">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">{t('admin.settings.general.other.title')}</h2>
          <p className="admin-settings-card-subtitle">{t('admin.settings.general.other.subtitle')}</p>
        </div>
      </div>

      <div className="admin-settings-row">
        <div className="admin-settings-column">
          <AdminFormField
            id="settings-items-per-page"
            label={t('admin.settings.general.other.itemsPerPage')}
            type="number"
            min="1"
            value={itemsPerPage}
            onChange={onChangeItemsPerPage}
          />
          <AdminSelect
            value={dateFormat}
            options={dateFormatOptions}
            onChange={onChangeDateFormat}
            label={t('admin.settings.general.other.dateFormat')}
          />
        </div>

        <div className="admin-settings-column admin-settings-toggle-list">
          <ToggleRow
            checked={enableAuditLog}
            onChange={onToggleAuditLog}
            label={t('admin.settings.general.other.enableAuditLog.label')}
            description={t('admin.settings.general.other.enableAuditLog.description')}
          />
          <ToggleRow
            checked={enableVideoProcessing}
            onChange={onToggleVideoProcessing}
            label={t('admin.settings.general.other.enableVideoProcessing.label')}
            description={t('admin.settings.general.other.enableVideoProcessing.description')}
          />
          <ToggleRow
            checked={maintenanceMode}
            onChange={onToggleMaintenanceMode}
            label={t('admin.settings.general.other.maintenanceMode.label')}
            description={t('admin.settings.general.other.maintenanceMode.description')}
          />
        </div>
      </div>
    </section>
  )
}
