import { useTranslation } from 'react-i18next'
import { InfoIcon } from './icons'
import { parseApiDateTime } from '../../../utils/time'
import type { SystemInformationData } from '../../../types/adminSettings'
import './adminSettings.css'

const SERVER_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

// Mismo cálculo que formatTimezoneOffset en RtpDashboardPage.tsx (footer "Timezone: UTC-04:00") --
// no está exportado desde ahí, así que se replica acá en vez de importar de otra pantalla por una
// función de 5 líneas.
function formatTimezoneOffset(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const hours = String(Math.floor(abs / 60)).padStart(2, '0')
  const minutes = String(abs % 60).padStart(2, '0')
  return `UTC${sign}${hours}:${minutes}`
}

interface SystemInformationCardProps {
  data: SystemInformationData
}

// Read-only -- pedido explícito: "no debe utilizar inputs... tabla visual simple y limpia sin
// borders visibles entre filas". Los valores vienen de SYSTEM_INFORMATION (mock, ver conversación:
// no existe todavía un endpoint real de versión/entorno/uptime/disco).
export function SystemInformationCard({ data }: SystemInformationCardProps) {
  const { t } = useTranslation()

  const rows: { label: string; value: string }[] = [
    { label: t('admin.settings.system.information.applicationVersion'), value: data.applicationVersion },
    { label: t('admin.settings.system.information.environment'), value: t(`admin.settings.general.siteInformation.environmentOptions.${data.environment}`) },
    {
      label: t('admin.settings.system.information.serverTime'),
      value: `${SERVER_TIME_FORMATTER.format(parseApiDateTime(data.serverTime))} (${formatTimezoneOffset(parseApiDateTime(data.serverTime))})`,
    },
    { label: t('admin.settings.system.information.uptime'), value: data.uptime },
    {
      label: t('admin.settings.system.information.availableDiskSpace'),
      value: t('admin.settings.system.information.diskSpaceValue', {
        used: data.diskSpaceUsedGb.toFixed(1),
        total: data.diskSpaceTotalGb.toFixed(0),
      }),
    },
  ]

  return (
    <section className="admin-panel admin-settings-card">
      <div className="admin-panel-header">
        <div className="admin-settings-card-heading">
          <span className="admin-settings-card-heading-icon admin-settings-card-heading-icon--inline">
            <InfoIcon />
          </span>
          <div>
            <h2 className="admin-panel-title">{t('admin.settings.system.information.title')}</h2>
            <p className="admin-settings-card-subtitle">{t('admin.settings.system.information.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="admin-settings-info-rows">
        {rows.map((row) => (
          <div key={row.label} className="admin-settings-info-row">
            <span className="admin-settings-info-label">{row.label}</span>
            <span className="admin-settings-info-value">{row.value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
