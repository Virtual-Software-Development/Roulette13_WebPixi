import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminFormField } from '../AdminFormField'
import { AdminSelect, type AdminSelectOption } from '../AdminSelect'
import { ENVIRONMENT_OPTIONS, LANGUAGE_OPTIONS, TIMEZONE_OPTIONS } from '../../../data/adminSettingsMockData'
import type { SettingsEnvironment } from '../../../types/adminSettings'
import './adminSettings.css'

interface SiteInformationCardProps {
  siteName: string
  environment: SettingsEnvironment
  timezone: string
  defaultLanguage: string
  onChangeSiteName: (value: string) => void
  onChangeEnvironment: (value: SettingsEnvironment) => void
  onChangeTimezone: (value: string) => void
  onChangeDefaultLanguage: (value: string) => void
}

export function SiteInformationCard({
  siteName,
  environment,
  timezone,
  defaultLanguage,
  onChangeSiteName,
  onChangeEnvironment,
  onChangeTimezone,
  onChangeDefaultLanguage,
}: SiteInformationCardProps) {
  const { t } = useTranslation()

  const environmentOptions: AdminSelectOption<SettingsEnvironment>[] = useMemo(
    () => ENVIRONMENT_OPTIONS.map((value) => ({ value, label: t(`admin.settings.general.siteInformation.environmentOptions.${value}`) })),
    [t],
  )
  // Timezone es texto ya formateado (dato, no copy de UI, ver adminSettingsMockData.ts) -- value y
  // label son el mismo string.
  const timezoneOptions: AdminSelectOption<string>[] = useMemo(() => TIMEZONE_OPTIONS.map((value) => ({ value, label: value })), [])
  const languageOptions: AdminSelectOption<string>[] = LANGUAGE_OPTIONS

  return (
    <section className="admin-panel admin-settings-card">
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">{t('admin.settings.general.siteInformation.title')}</h2>
          <p className="admin-settings-card-subtitle">{t('admin.settings.general.siteInformation.subtitle')}</p>
        </div>
      </div>

      <div className="admin-settings-row">
        <AdminFormField
          id="settings-site-name"
          label={t('admin.settings.general.siteInformation.siteName')}
          value={siteName}
          onChange={onChangeSiteName}
        />
        <AdminSelect
          value={environment}
          options={environmentOptions}
          onChange={onChangeEnvironment}
          label={t('admin.settings.general.siteInformation.environment')}
        />
      </div>

      <div className="admin-settings-row">
        <AdminSelect
          value={timezone}
          options={timezoneOptions}
          onChange={onChangeTimezone}
          label={t('admin.settings.general.siteInformation.timezone')}
        />
        <AdminSelect
          value={defaultLanguage}
          options={languageOptions}
          onChange={onChangeDefaultLanguage}
          label={t('admin.settings.general.siteInformation.defaultLanguage')}
        />
      </div>
    </section>
  )
}
