import type {
  DatabaseType,
  EmailNotificationSettings,
  GeneralSettingsData,
  NotificationChannelsSettings,
  NotificationEventId,
  NotificationEventsSettings,
  RecentNotification,
  SettingsEnvironment,
  SystemDatabaseSettings,
  SystemInformationData,
  SystemStorageSettings,
} from '../types/adminSettings'

// Mock TEMPORAL para Admin Settings -- no existe todavía un endpoint/store de configuración
// general del sistema (las únicas APIs reales del proyecto son gameInfo/lastResults/drawResult/
// betsSummary, ver investigación previa). Reemplazar este archivo por el fetch/store real no
// requiere tocar ningún componente: todos reciben estos datos por props (mismo criterio que
// adminDashboardMockData.ts/rtpManagementMockData.ts).

export const DEFAULT_GENERAL_SETTINGS: GeneralSettingsData = {
  siteName: 'VR Gaming',
  environment: 'production',
  timezone: '(UTC-04:00) Eastern Time (US & Canada)',
  defaultLanguage: 'en-US',
  rouletteVideos: { defaultStoragePath: 'D:\\Videos\\Roulette', acceptedFormats: 'MP4, WebM', maxFileSizeMb: 500 },
  quickMoneyVideos: { defaultStoragePath: 'D:\\Videos\\QuickMoney', acceptedFormats: 'MP4, WebM', maxFileSizeMb: 500 },
  itemsPerPage: 50,
  dateFormat: 'MMM d, yyyy',
  enableAuditLog: true,
  enableVideoProcessing: true,
  maintenanceMode: false,
}

export const ENVIRONMENT_OPTIONS: SettingsEnvironment[] = ['production', 'staging', 'development']

export const TIMEZONE_OPTIONS: string[] = [
  '(UTC-04:00) Eastern Time (US & Canada)',
  '(UTC-05:00) Central Time (US & Canada)',
  '(UTC-06:00) Mountain Time (US & Canada)',
  '(UTC-07:00) Pacific Time (US & Canada)',
  '(UTC+00:00) UTC',
]

export const DATE_FORMAT_OPTIONS: string[] = ['MMM d, yyyy', 'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd']

// Códigos reales soportados por i18n (ver src/i18n/index.ts) -- nunca una lista inventada. Los
// nombres de idioma van en su propio endónimo (English/Español), no traducidos vía i18n, mismo
// criterio que cualquier selector de idioma real.
export const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'en-US', label: 'English' },
  { value: 'es', label: 'Español' },
]

export const DATABASE_TYPE_OPTIONS: DatabaseType[] = ['mysql', 'postgresql', 'sqlite']

export const DEFAULT_SYSTEM_DATABASE_SETTINGS: SystemDatabaseSettings = {
  connectionStatus: 'connected',
  databaseType: 'mysql',
  host: 'localhost',
  port: '3306',
  databaseName: 'vr_gaming',
  username: 'admin',
  password: 'change-me-123',
}

export const DEFAULT_SYSTEM_STORAGE_SETTINGS: SystemStorageSettings = {
  baseDataPath: 'D:\\VRGaming',
  videosPath: 'D:\\Videos',
  logsPath: 'D:\\Logs',
  maxLogFileSizeMb: 100,
  keepLogsForDays: 30,
}

// Read-only, no editable/resettable (ver types/adminSettings.ts) -- no existe todavía un endpoint
// que reporte versión/entorno/uptime/disco reales (confirmado: las únicas APIs del proyecto son
// gameInfo/lastResults/drawResult/betsSummary), así que estos valores quedan fijos como mock hasta
// que exista esa fuente real.
export const SYSTEM_INFORMATION: SystemInformationData = {
  applicationVersion: '1.0.0',
  environment: 'production',
  serverTime: '2026-09-04 14:25:18',
  uptime: '3 days, 4 hours, 12 minutes',
  diskSpaceUsedGb: 245.8,
  diskSpaceTotalGb: 500,
}

// Igual que la referencia: Email habilitado, Discord/Slack/Webhook deshabilitados -- no existe
// todavía un backend/store real de notificaciones (confirmado: las únicas APIs del proyecto son
// gameInfo/lastResults/drawResult/betsSummary), así que este estado vive solo en memoria del tab,
// sin Save Changes (mismo criterio que System: nada que "guardar" en un servidor que no existe).
export const DEFAULT_NOTIFICATION_CHANNELS: NotificationChannelsSettings = {
  email: true,
  discord: false,
  slack: false,
  webhook: false,
}

export const DEFAULT_EMAIL_NOTIFICATION_SETTINGS: EmailNotificationSettings = {
  smtpServer: 'smtp.gmail.com',
  port: '587',
  username: 'admin@vrgaming.com',
  password: 'change-me-123',
  fromEmail: 'admin@vrgaming.com',
  recipients: 'alerts@vrgaming.com',
}

export const NOTIFICATION_EVENT_IDS: NotificationEventId[] = [
  'gameRoundStarted',
  'gameRoundCompleted',
  'systemErrors',
  'highRtpAlert',
  'videoProcessingCompleted',
  'videoProcessingFailed',
  'newUserRegistered',
]

export const DEFAULT_NOTIFICATION_EVENTS: NotificationEventsSettings = {
  gameRoundStarted: false,
  gameRoundCompleted: true,
  systemErrors: true,
  highRtpAlert: false,
  videoProcessingCompleted: true,
  videoProcessingFailed: true,
  newUserRegistered: false,
}

// Historial visual de ejemplo (ver comentario de cabecera de este archivo) -- no existe todavía un
// endpoint/store real de notificaciones, así que Refresh en la UI solo vuelve a mostrar este mismo
// set fijo (ver RecentNotificationsCard.tsx).
export const RECENT_NOTIFICATIONS: RecentNotification[] = [
  { id: 'ntf-1', timestamp: '2026-09-04 14:20:11', message: 'Video processing completed', channel: 'email', status: 'sent' },
  { id: 'ntf-2', timestamp: '2026-09-04 13:45:02', message: 'Game round completed', channel: 'email', status: 'sent' },
  { id: 'ntf-3', timestamp: '2026-09-04 12:11:33', message: 'System error', channel: 'email', status: 'failed' },
  { id: 'ntf-4', timestamp: '2026-09-04 10:03:18', message: 'New user registered', channel: 'slack', status: 'sent' },
  { id: 'ntf-5', timestamp: '2026-09-04 09:15:47', message: 'High RTP alert', channel: 'email', status: 'sent' },
]
