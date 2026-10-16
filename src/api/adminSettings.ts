import { adminFetch, readAdminJson as readJson } from './adminSession'
import type { AdminSettingsData, NotificationEventId, NotificationEventsSettings } from '../types/adminSettings'

// GET/PUT /admin-settings de quick-money-backend (JWT con rol admin): sin sesión adminFetch lanza
// AdminAuthError.

interface ApiNotificationEvent {
  code: string
  enabled: boolean
}

interface ApiAdminSettings {
  general: {
    timezone: string
    defaultLanguage: string
    adminLanguage: string
    itemsPerPage: number
    dateFormat: string
    maintenanceMode: boolean
  }
  notifications: {
    emailEnabled: boolean
    recipients: string[]
    events: ApiNotificationEvent[]
  }
}

interface ApiAdminSettingsResponse {
  current: ApiAdminSettings
  defaults: ApiAdminSettings
}

export interface AdminSettingsSnapshot {
  current: AdminSettingsData
  defaults: AdminSettingsData
}

// notification_event_type.code (migración 000021) de cada evento de la UI.
const EVENT_CODES: Record<NotificationEventId, string> = {
  rtpOutOfBand: 'RTP_OUT_OF_BAND',
  manualResultOverride: 'MANUAL_RESULT_OVERRIDE',
  rtpSettingsChanged: 'RTP_SETTINGS_CHANGED',
  rtpProfileExpiringSoon: 'RTP_PROFILE_EXPIRING_SOON',
  roundFailed: 'ROUND_FAILED',
  mqttBrokerBlocked: 'MQTT_BROKER_BLOCKED',
  machineOffline: 'MACHINE_OFFLINE',
  largeWin: 'LARGE_WIN',
  userAccessChanged: 'USER_ACCESS_CHANGED',
  maintenanceModeToggled: 'MAINTENANCE_MODE_TOGGLED',
}

const EVENT_IDS_BY_CODE = new Map(Object.entries(EVENT_CODES).map(([id, code]) => [code, id as NotificationEventId]))

export function formatRecipients(recipients: string[]): string {
  return recipients.join(', ')
}

export function parseRecipients(value: string): string[] {
  return value
    .split(/[,;\s]+/)
    .map((email) => email.trim())
    .filter(Boolean)
}

// Eventos del backend que la UI no conoce se ignoran (no hay texto para mostrarlos).
function toUi(settings: ApiAdminSettings): AdminSettingsData {
  const notificationEvents: NotificationEventsSettings = {}
  for (const event of settings.notifications.events) {
    const id = EVENT_IDS_BY_CODE.get(event.code)
    if (id) notificationEvents[id] = event.enabled
  }
  return {
    general: { ...settings.general },
    notificationChannels: { email: settings.notifications.emailEnabled },
    emailNotifications: { recipients: formatRecipients(settings.notifications.recipients) },
    notificationEvents,
  }
}

function toApi(settings: AdminSettingsData): ApiAdminSettings {
  const events: ApiNotificationEvent[] = []
  for (const [id, enabled] of Object.entries(settings.notificationEvents)) {
    if (enabled !== undefined) events.push({ code: EVENT_CODES[id as NotificationEventId], enabled })
  }
  return {
    general: { ...settings.general },
    notifications: {
      emailEnabled: settings.notificationChannels.email,
      recipients: parseRecipients(settings.emailNotifications.recipients),
      events,
    },
  }
}

function toSnapshot(res: ApiAdminSettingsResponse): AdminSettingsSnapshot {
  return { current: toUi(res.current), defaults: toUi(res.defaults) }
}

export async function fetchAdminSettings(): Promise<AdminSettingsSnapshot> {
  return toSnapshot(await readJson(await adminFetch('/admin-settings'), 'Load settings'))
}

export async function saveAdminSettings(settings: AdminSettingsData): Promise<AdminSettingsSnapshot> {
  const res = await adminFetch('/admin-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toApi(settings)),
  })
  return toSnapshot(await readJson(res, 'Save settings'))
}
