import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminFormField } from '../AdminFormField'
import { AdminSelect, type AdminSelectOption } from '../AdminSelect'
import type { CreditMode } from '../../../types/adminSettings'
import { DATE_FORMAT_OPTIONS, LANGUAGE_OPTIONS, timezoneOptions } from './settingsOptions'
import './adminSettings.css'

interface GeneralSettingsCardProps {
  timezone: string
  defaultLanguage: string
  adminLanguage: string
  itemsPerPage: number
  dateFormat: string
  maintenanceMode: boolean
  creditMode: CreditMode
  onChangeTimezone: (value: string) => void
  onChangeDefaultLanguage: (value: string) => void
  onChangeAdminLanguage: (value: string) => void
  onChangeItemsPerPage: (value: string) => void
  onChangeDateFormat: (value: string) => void
  onToggleMaintenanceMode: () => void
  onChangeCreditMode: (value: CreditMode) => void
}

// Única card del tab General -- combina las antiguas Site Information y Other Settings (pedido
// explícito), sin Site Name / Environment / Enable Audit Log / Enable Video Processing (eliminados).
export function GeneralSettingsCard({
  timezone,
  defaultLanguage,
  adminLanguage,
  itemsPerPage,
  dateFormat,
  maintenanceMode,
  creditMode,
  onChangeTimezone,
  onChangeDefaultLanguage,
  onChangeAdminLanguage,
  onChangeItemsPerPage,
  onChangeDateFormat,
  onToggleMaintenanceMode,
  onChangeCreditMode,
}: GeneralSettingsCardProps) {
  const { t } = useTranslation()

  const creditModeOptions: AdminSelectOption<CreditMode>[] = [
    { value: 'MACHINE', label: t('admin.settings.general.other.creditMode.machine') },
    { value: 'TICKET', label: t('admin.settings.general.other.creditMode.ticket') },
  ]

  const zoneOptions = useMemo(() => timezoneOptions(timezone), [timezone])

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
          <AdminSelect value={timezone} options={zoneOptions} onChange={onChangeTimezone} label={t('admin.settings.general.siteInformation.timezone')} />
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
            max="500"
            value={itemsPerPage}
            onChange={onChangeItemsPerPage}
          />
          <AdminSelect value={dateFormat} options={DATE_FORMAT_OPTIONS} onChange={onChangeDateFormat} label={t('admin.settings.general.other.dateFormat')} />
        </div>
      </div>

      {/* Maintenance Mode y el modo de crédito a la izquierda, el idioma del panel de admin a la
          derecha, bajo Date Format. */}
      <div className="admin-settings-row">
        <div className="admin-settings-inline">
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
          {/* Modo de crédito: el comportamiento de siempre (balance de la máquina) o el ticket de
              crédito que lleva el jugador. */}
          <div>
            <AdminSelect
              value={creditMode}
              options={creditModeOptions}
              onChange={onChangeCreditMode}
              label={t('admin.settings.general.other.creditMode.label')}
            />
            <p className="admin-settings-toggle-description admin-settings-field-hint">
              {t(creditMode === 'TICKET' ? 'admin.settings.general.other.creditMode.ticketHint' : 'admin.settings.general.other.creditMode.machineHint')}
            </p>
          </div>
        </div>
        <AdminSelect
          value={adminLanguage}
          options={LANGUAGE_OPTIONS}
          onChange={onChangeAdminLanguage}
          label={t('admin.settings.general.other.adminLanguage')}
        />
      </div>
    </section>
  )
}
