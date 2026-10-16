import type { AdminSelectOption } from '../AdminSelect'
import type { NotificationEventId } from '../../../types/adminSettings'

// Zonas IANA ofrecidas en Settings > Timezone. El backend acepta cualquier zona IANA válida; si la
// guardada no está en esta lista igual se muestra (ver timezoneOptions).
const TIMEZONES = [
  'America/Santo_Domingo',
  'America/Puerto_Rico',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/Bogota',
  'Europe/Madrid',
  'UTC',
]

// "(GMT-04:00) Santo Domingo" -- el offset sale de Intl con la fecha de hoy (respeta horario de verano).
function timezoneLabel(timeZone: string): string {
  const city = timeZone.split('/').pop()?.replace(/_/g, ' ') ?? timeZone
  try {
    const offset = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(new Date())
      .find((part) => part.type === 'timeZoneName')?.value
    if (!offset) return city
    return `(${offset === 'GMT' ? 'GMT+00:00' : offset}) ${city}`
  } catch {
    return timeZone
  }
}

export function timezoneOptions(current: string): AdminSelectOption<string>[] {
  const zones = current && !TIMEZONES.includes(current) ? [current, ...TIMEZONES] : TIMEZONES
  return zones.map((value) => ({ value, label: timezoneLabel(value) }))
}

// Mismos patrones que valida el backend (settings.DateFormats) -- dato, no copy de UI.
export const DATE_FORMAT_OPTIONS: AdminSelectOption<string>[] = ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'MMM D, YYYY'].map((value) => ({
  value,
  label: value,
}))

// Códigos del backend (settings.Languages); el lobby los mapea a los de i18n (applyGameInfo.ts). Los
// nombres van en su propio endónimo, no traducidos.
export const LANGUAGE_OPTIONS: AdminSelectOption<string>[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
]

// Orden de la sección Notification Events.
export const NOTIFICATION_EVENT_IDS: NotificationEventId[] = [
  'rtpOutOfBand',
  'manualResultOverride',
  'rtpSettingsChanged',
  'rtpProfileExpiringSoon',
  'roundFailed',
  'mqttBrokerBlocked',
  'machineOffline',
  'largeWin',
  'userAccessChanged',
  'maintenanceModeToggled',
]
