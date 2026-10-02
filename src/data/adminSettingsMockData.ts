import type {
  AdminSettingsData,
  EmailNotificationSettings,
  GeneralSettingsData,
  NotificationChannelsSettings,
  NotificationEventId,
  NotificationEventsSettings,
} from '../types/adminSettings'

// Mock TEMPORAL para Admin Settings -- no existe todavía un endpoint/store de configuración
// general del sistema (las únicas APIs reales del proyecto son gameInfo/lastResults/drawResult/
// betsSummary, ver investigación previa). Reemplazar este archivo por el fetch/store real no
// requiere tocar ningún componente: todos reciben estos datos por props (mismo criterio que
// adminDashboardMockData.ts/rtpManagementMockData.ts).

export const DEFAULT_GENERAL_SETTINGS: GeneralSettingsData = {
  timezone: '(UTC-04:00) Eastern Time (US & Canada)',
  defaultLanguage: 'en-US',
  itemsPerPage: 50,
  dateFormat: 'MMM d, yyyy',
  maintenanceMode: false,
}

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

// Email habilitado por defecto -- no existe todavía un backend/store real de notificaciones
// (confirmado: las únicas APIs del proyecto son gameInfo/lastResults/drawResult/betsSummary), así
// que este estado vive solo en memoria de la página; el Save de la página solo actualiza ese baseline.
export const DEFAULT_NOTIFICATION_CHANNELS: NotificationChannelsSettings = {
  email: true,
}

export const DEFAULT_EMAIL_NOTIFICATION_SETTINGS: EmailNotificationSettings = {
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

export const DEFAULT_ADMIN_SETTINGS: AdminSettingsData = {
  general: DEFAULT_GENERAL_SETTINGS,
  notificationChannels: DEFAULT_NOTIFICATION_CHANNELS,
  emailNotifications: DEFAULT_EMAIL_NOTIFICATION_SETTINGS,
  notificationEvents: DEFAULT_NOTIFICATION_EVENTS,
}
