export interface GeneralSettingsData {
  // Nombre IANA (ej. "America/Santo_Domingo"), tal como lo guarda general_settings.timezone.
  timezone: string
  // Código del backend ('en' | 'es') -- también es el idioma que el lobby recibe en /gameInfo.
  defaultLanguage: string
  // Idioma del panel de admin ('en' | 'es'), aparte del de las pantallas de juego.
  adminLanguage: string
  itemsPerPage: number
  // Uno de los patrones que acepta el backend (ver DATE_FORMAT_OPTIONS en settingsOptions.ts).
  dateFormat: string
  maintenanceMode: boolean
  // Dónde vive el crédito de los jugadores (general_settings.credit_mode): 'MACHINE' (por defecto, el
  // balance de cada máquina) o 'TICKET' (un ticket de crédito que lleva el jugador).
  creditMode: CreditMode
}

export type CreditMode = 'MACHINE' | 'TICKET'

// Email es el único canal de notificación (Discord/Slack/Webhook eliminados).
export type NotificationChannelId = 'email'

export type NotificationChannelsSettings = Record<NotificationChannelId, boolean>

export interface EmailNotificationSettings {
  // Coma-separado en el input; el backend lo guarda como una fila por destinatario.
  recipients: string
}

// Eventos de la sección Notification Events -- cada uno es un notification_event_type del backend
// (ver EVENT_CODES en api/adminSettings.ts).
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

// Partial: solo están los eventos que el backend conoce; los demás no se muestran.
export type NotificationEventsSettings = Partial<Record<NotificationEventId, boolean>>

// Todo lo editable de la página de Settings como una sola unidad -- un único Save/Reset para la
// página entera (pedido explícito), así que el draft y el baseline guardado viven juntos.
export interface AdminSettingsData {
  general: GeneralSettingsData
  notificationChannels: NotificationChannelsSettings
  emailNotifications: EmailNotificationSettings
  notificationEvents: NotificationEventsSettings
}
