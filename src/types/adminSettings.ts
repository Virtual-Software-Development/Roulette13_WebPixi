export interface GeneralSettingsData {
  // Texto ya formateado para mostrar (ej. "(UTC-04:00) Eastern Time (US & Canada)") -- dato, no
  // copy de UI, mismo criterio que los campos de RtpProfile.
  timezone: string
  // Código real de idioma soportado por i18n (ver src/i18n/index.ts: 'en-US' | 'es') -- nunca una
  // lista de idiomas inventada.
  defaultLanguage: string
  itemsPerPage: number
  // Patrón de formato ya formateado (ej. "MMM d, yyyy") -- dato, no copy de UI.
  dateFormat: string
  maintenanceMode: boolean
}

// Email es el único canal de notificación (Discord/Slack/Webhook eliminados).
export type NotificationChannelId = 'email'

export type NotificationChannelsSettings = Record<NotificationChannelId, boolean>

export interface EmailNotificationSettings {
  // Coma-separado (ver referencia: "Use comma to separate multiple recipients") -- string plano,
  // no un array (dato ya formateado como
  // texto, no una lista editable con su propio UI de tags/chips).
  recipients: string
}

// Eventos que pueden disparar una notificación (ver la sección Notification Events de Settings).
// Todavía no hay backend de notificaciones: estos ids son el contrato que ese backend deberá emitir.
export type NotificationEventId =
  | 'rtpOutOfBand'
  | 'manualResultOverride'
  | 'rtpSettingsChanged'
  | 'rtpProfileExpiringSoon'
  | 'roundFailed'
  | 'mqttBrokerBlocked'
  | 'machineOffline'
  | 'largeWin'
  | 'userAccessChanged'
  | 'maintenanceModeToggled'

export type NotificationEventsSettings = Record<NotificationEventId, boolean>

// Todo lo editable de la página de Settings como una sola unidad -- un único Save/Reset para la
// página entera (pedido explícito), así que el draft y el baseline guardado viven juntos.
export interface AdminSettingsData {
  general: GeneralSettingsData
  notificationChannels: NotificationChannelsSettings
  emailNotifications: EmailNotificationSettings
  notificationEvents: NotificationEventsSettings
}
