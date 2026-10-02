import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminFormField } from '../AdminFormField'
import { AdminSelect, type AdminSelectOption } from '../AdminSelect'
import { DATE_FORMAT_OPTIONS, LANGUAGE_OPTIONS, TIMEZONE_OPTIONS } from '../../../data/adminSettingsMockData'
import './adminSettings.css'

interface GeneralSettingsCardProps {
  timezone: string
  defaultLanguage: string
  itemsPerPage: number
  dateFormat: string
  maintenanceMode: boolean
  onChangeTimezone: (value: string) => void
  onChangeDefaultLanguage: (value: string) => void
  onChangeItemsPerPage: (value: string) => void
  onChangeDateFormat: (value: string) => void
  onToggleMaintenanceMode: () => void
}

// Única card del tab General -- combina las antiguas Site Information y Other Settings (pedido
// explícito), sin Site Name / Environment / Enable Audit Log / Enable Video Processing (eliminados).
export function GeneralSettingsCard({
  timezone,
  defaultLanguage,
  itemsPerPage,
  dateFormat,
  maintenanceMode,
  onChangeTimezone,
  onChangeDefaultLanguage,
  onChangeItemsPerPage,
  onChangeDateFormat,
  onToggleMaintenanceMode,
}: GeneralSettingsCardProps) {
  const { t } = useTranslation()

  // Timezone y Date Format son texto ya formateado (dato, no copy de UI, ver
  // adminSettingsMockData.ts) -- value y label son el mismo string.
  const timezoneOptions: AdminSelectOption<string>[] = useMemo(() => TIMEZONE_OPTIONS.map((value) => ({ value, label: value })), [])
  const dateFormatOptions: AdminSelectOption<string>[] = useMemo(() => DATE_FORMAT_OPTIONS.map((value) => ({ value, label: value })), [])

  return (
    <section className="admin-panel admin-settings-card">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">{t('admin.settings.general.card.title')}</h2>
          <p className="admin-settings-card-subtitle">{t('admin.settings.general.card.subtitle')}</p>
        </div>
      </div>

      {/* Dos columnas apiladas (pedido explícito): Timezone sobre Default Language, Items per Page
          sobre Date Format. Columnas como wrappers (no un grid de 4 celdas) para que en mobile el
          orden siga siendo Timezone → Language → Items → Date. */}
      <div className="admin-settings-row">
        <div className="admin-settings-column">
          <AdminSelect value={timezone} options={timezoneOptions} onChange={onChangeTimezone} label={t('admin.settings.general.siteInformation.timezone')} />
          <AdminSelect
            value={defaultLanguage}
            options={LANGUAGE_OPTIONS}
            onChange={onChangeDefaultLanguage}
            label={t('admin.settings.general.siteInformation.defaultLanguage')}
          />
        </div>
        <div className="admin-settings-column">
          <AdminFormField
            id="settings-items-per-page"
            label={t('admin.settings.general.other.itemsPerPage')}
            type="number"
            min="1"
            value={itemsPerPage}
            onChange={onChangeItemsPerPage}
          />
          <AdminSelect value={dateFormat} options={dateFormatOptions} onChange={onChangeDateFormat} label={t('admin.settings.general.other.dateFormat')} />
        </div>
      </div>

      <div className="admin-settings-toggle-row">
        <label className="admin-settings-toggle">
          <input type="checkbox" className="admin-settings-toggle-input" checked={maintenanceMode} onChange={onToggleMaintenanceMode} />
          <span className="admin-settings-toggle-track">
            <span className="admin-settings-toggle-thumb" />
          </span>
        </label>
        <div>
          <p className="admin-settings-toggle-label">{t('admin.settings.general.other.maintenanceMode.label')}</p>
          <p className="admin-settings-toggle-description">{t('admin.settings.general.other.maintenanceMode.description')}</p>
        </div>
      </div>
    </section>
  )
}
