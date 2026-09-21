export type AdminSettingsTab = 'general' | 'system' | 'notifications'

export type SettingsEnvironment = 'production' | 'staging' | 'development'

export interface VideoLibrarySettings {
  defaultStoragePath: string
  // "MP4, WebM" -- ya viene formateado como texto de solo lectura (mismo criterio que
  // RtpProfile.scheduleSummary: es un dato, no una lista editable todavía).
  acceptedFormats: string
  maxFileSizeMb: number
}

export interface GeneralSettingsData {
  siteName: string
  environment: SettingsEnvironment
  // Texto ya formateado para mostrar (ej. "(UTC-04:00) Eastern Time (US & Canada)") -- dato, no
  // copy de UI, mismo criterio que los campos de RtpProfile.
  timezone: string
  // Código real de idioma soportado por i18n (ver src/i18n/index.ts: 'en-US' | 'es') -- nunca una
  // lista de idiomas inventada.
  defaultLanguage: string
  rouletteVideos: VideoLibrarySettings
  quickMoneyVideos: VideoLibrarySettings
  itemsPerPage: number
  // Patrón de formato ya formateado (ej. "MMM d, yyyy") -- dato, no copy de UI.
  dateFormat: string
  enableAuditLog: boolean
  enableVideoProcessing: boolean
  maintenanceMode: boolean
}

export type DatabaseConnectionStatus = 'connected' | 'disconnected'

export type DatabaseType = 'mysql' | 'postgresql' | 'sqlite'

export interface SystemDatabaseSettings {
  // No hay backend real de base de datos (ver conversación) -- mock temporal, mismo criterio que
  // el resto de Settings. connectionStatus queda como dato recibido, no algo que este formulario
  // calcule.
  connectionStatus: DatabaseConnectionStatus
  databaseType: DatabaseType
  host: string
  port: string
  databaseName: string
  username: string
  password: string
}

export interface SystemStorageSettings {
  baseDataPath: string
  videosPath: string
  logsPath: string
  maxLogFileSizeMb: number
  keepLogsForDays: number
}

// Read-only -- no forma parte del draft editable de Database/Storage, y por lo tanto tampoco de
// Factory Reset (ver conversación: Factory Reset solo restaura Database/Storage a sus defaults).
export interface SystemInformationData {
  applicationVersion: string
  environment: SettingsEnvironment
  serverTime: string
  uptime: string
  diskSpaceUsedGb: number
  diskSpaceTotalGb: number
}

export type NotificationChannelId = 'email' | 'discord' | 'slack' | 'webhook'

export type NotificationChannelsSettings = Record<NotificationChannelId, boolean>

export interface EmailNotificationSettings {
  smtpServer: string
  port: string
  username: string
  password: string
  fromEmail: string
  // Coma-separado (ver referencia: "Use comma to separate multiple recipients") -- string plano,
  // no un array, mismo criterio que VideoLibrarySettings.acceptedFormats (dato ya formateado como
  // texto, no una lista editable con su propio UI de tags/chips).
  recipients: string
}

// Tipos de evento reales de la app: no existe todavía un backend/store de notificaciones (ver
// conversación), así que estos ids son puramente descriptivos para este mock -- no representan un
// enum real consumido por otra parte del sistema.
export type NotificationEventId =
  | 'gameRoundStarted'
  | 'gameRoundCompleted'
  | 'systemErrors'
  | 'highRtpAlert'
  | 'videoProcessingCompleted'
  | 'videoProcessingFailed'
  | 'newUserRegistered'

export type NotificationEventsSettings = Record<NotificationEventId, boolean>

export type NotificationDeliveryStatus = 'sent' | 'failed'

export interface RecentNotification {
  id: string
  // Formato "yyyy-MM-dd HH:mm:ss" (ver utils/time.ts:parseApiDateTime), mismo criterio que
  // GameEvent.logEntries y SystemInformationData.serverTime.
  timestamp: string
  // Texto de mensaje ya formateado (dato, no copy de UI) -- mismo criterio que
  // DrawLogModal/GameEvent.logEntries.message, no un id ligado a NotificationEventId porque el
  // historial es texto libre, no un disparador de configuración.
  message: string
  channel: NotificationChannelId
  status: NotificationDeliveryStatus
}
