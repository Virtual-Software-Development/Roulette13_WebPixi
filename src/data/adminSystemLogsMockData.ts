import { buildMediaUrl } from '../utils/media'
import type { SystemLogEntry, SystemLogModule, SystemLogAction, SystemLogStatus, SystemLogChange } from '../types/adminSystemLogs'

// Mock TEMPORAL -- no existe todavía un endpoint/store de audit log (ver investigación: ningún tipo
// ni data file relacionado a logs existía antes de esta feature). Mismo criterio que
// adminDashboardMockData.ts: reemplazar esto por el fetch/store real no requiere tocar ningún
// componente, todos reciben SystemLogEntry[] ya armado.

// Logos reales de marca (pedido explícito, mismo criterio que RTP_GAME_ICON_URLS/
// REPORT_GAME_ICON_URLS) -- acá "quickMoney" es el módulo genérico (no se separa por Pick 3/Pick 4
// en System Logs), así que usa el logo genérico de Quick Money, no el de un juego específico.
export const SYSTEM_LOG_MODULE_ICON_URLS: Record<SystemLogModule, string> = {
  roulette: buildMediaUrl('Website_svg_icons/46_logo_option_2.svg'),
  quickMoney: buildMediaUrl('Website_svg_icons/43_quick-money-logo.svg'),
  rtp: buildMediaUrl('Website_svg_icons/05_target_white.svg'),
  users: buildMediaUrl('Website_svg_icons/16_user_white_circle.svg'),
  events: buildMediaUrl('Website_svg_icons/33_calendar_white.svg'),
  videos: buildMediaUrl('Website_svg_icons/34_play_white.svg'),
  reports: buildMediaUrl('Website_svg_icons/09_analytics_white.svg'),
  settings: buildMediaUrl('Website_svg_icons/17_gear_white.svg'),
  system: buildMediaUrl('Website_svg_icons/20_monitor_white.svg'),
}

// Avatar de la columna User -- un actor humano (Admin/Operator1/Operator2) usa el ícono de persona,
// un actor automatizado (actorRole 'System', ej. SERVICE_RESTART/RESCAN_LIBRARY) usa el mismo
// ícono de monitor que el módulo "system", para distinguir de un vistazo acción humana vs. del
// sistema (no hay fotos de usuario reales, pedido explícito: "no agregues fotografías").
export const SYSTEM_LOG_HUMAN_ACTOR_ICON_URL = buildMediaUrl('Website_svg_icons/16_user_white_circle.svg')
export const SYSTEM_LOG_SYSTEM_ACTOR_ICON_URL = buildMediaUrl('Website_svg_icons/20_monitor_white.svg')

interface LogTemplate {
  module: SystemLogModule
  action: SystemLogAction
  status: SystemLogStatus
  actor: string
  actorRole: string
  summary: string
  change?: SystemLogChange
  detailsText?: string
}

const TEMPLATES: LogTemplate[] = [
  { module: 'roulette', action: 'CHANGE_RESULT', status: 'success', actor: 'Admin', actorRole: 'Administrator', summary: 'Changed next result to 17', change: { fieldLabel: 'Next Result', before: '8', after: '17' } },
  { module: 'roulette', action: 'CHANGE_RESULT', status: 'success', actor: 'Admin', actorRole: 'Administrator', summary: 'Changed next result to 0', change: { fieldLabel: 'Next Result', before: '23', after: '0' } },
  { module: 'quickMoney', action: 'CHANGE_RESULT', status: 'success', actor: 'Operator1', actorRole: 'Operator', summary: 'Updated Pick 3 result to 4-8-1', change: { fieldLabel: 'Pick 3 Result', before: '2-7-3', after: '4-8-1' } },
  { module: 'quickMoney', action: 'CHANGE_RESULT', status: 'success', actor: 'Operator1', actorRole: 'Operator', summary: 'Updated Pick 4 result to 2-7-3-9', change: { fieldLabel: 'Pick 4 Result', before: '5-1-6-0', after: '2-7-3-9' } },
  { module: 'events', action: 'CREATE_EVENT', status: 'success', actor: 'Admin', actorRole: 'Administrator', summary: 'Created Pick 3 event #1008' },
  { module: 'events', action: 'CREATE_EVENT', status: 'success', actor: 'Admin', actorRole: 'Administrator', summary: 'Created Pick 4 event #1012' },
  {
    module: 'events',
    action: 'UPDATE_EVENT',
    status: 'success',
    actor: 'Operator2',
    actorRole: 'Operator',
    summary: 'Rescheduled event #1005 start time',
    change: { fieldLabel: 'Start Time', before: '14:00', after: '14:30' },
  },
  { module: 'events', action: 'DELETE_EVENT', status: 'warning', actor: 'Operator2', actorRole: 'Operator', summary: 'Deleted event #1007', detailsText: 'Event #1007 was deleted before its scheduled draw completed.' },
  {
    module: 'rtp',
    action: 'UPDATE_RTP_TARGET',
    status: 'success',
    actor: 'Operator1',
    actorRole: 'Operator',
    summary: 'Updated Roulette RTP target to 94.80%',
    change: { fieldLabel: 'RTP Target', before: '94.20%', after: '94.80%' },
  },
  {
    module: 'rtp',
    action: 'UPDATE_RTP_TARGET',
    status: 'success',
    actor: 'Operator1',
    actorRole: 'Operator',
    summary: 'Updated Quick Money RTP target to 92.50%',
    change: { fieldLabel: 'RTP Target', before: '91.00%', after: '92.50%' },
  },
  { module: 'users', action: 'CREATE_USER', status: 'success', actor: 'Admin', actorRole: 'Administrator', summary: 'Created user "Operator3"' },
  {
    module: 'users',
    action: 'UPDATE_USER',
    status: 'success',
    actor: 'Admin',
    actorRole: 'Administrator',
    summary: 'Changed role for user "Operator2"',
    change: { fieldLabel: 'Role', before: 'Operator', after: 'Administrator' },
  },
  { module: 'users', action: 'DEACTIVATE_USER', status: 'warning', actor: 'Admin', actorRole: 'Administrator', summary: 'Deactivated user "Operator4"' },
  { module: 'videos', action: 'UPLOAD_VIDEO', status: 'success', actor: 'Operator1', actorRole: 'Operator', summary: 'Uploaded video for Roulette number 17 (Variant A)' },
  { module: 'videos', action: 'REPLACE_VIDEO', status: 'success', actor: 'Operator2', actorRole: 'Operator', summary: 'Replaced video for Quick Money Pick 3 draw #0563' },
  { module: 'videos', action: 'RESCAN_LIBRARY', status: 'success', actor: 'System', actorRole: 'System', summary: 'Re-scanned Roulette video library' },
  {
    module: 'videos',
    action: 'UPLOAD_VIDEO',
    status: 'failed',
    actor: 'Operator1',
    actorRole: 'Operator',
    summary: 'Upload failed for Roulette number 24 (Variant C)',
    detailsText: 'Upload rejected: file checksum did not match the expected format.',
  },
  { module: 'reports', action: 'GENERATE_REPORT', status: 'success', actor: 'Admin', actorRole: 'Administrator', summary: 'Generated payouts report (last 7 days)' },
  { module: 'reports', action: 'GENERATE_REPORT', status: 'success', actor: 'Operator1', actorRole: 'Operator', summary: 'Generated RTP trend report (last 30 days)' },
  {
    module: 'settings',
    action: 'UPDATE_SETTINGS',
    status: 'success',
    actor: 'Operator1',
    actorRole: 'Operator',
    summary: 'Changed system timezone to UTC',
    change: { fieldLabel: 'Timezone', before: 'America/New_York', after: 'UTC' },
  },
  {
    module: 'settings',
    action: 'UPDATE_SETTINGS',
    status: 'success',
    actor: 'Admin',
    actorRole: 'Administrator',
    summary: 'Enabled audit log recording',
    change: { fieldLabel: 'Enable Audit Log', before: 'Off', after: 'On' },
  },
  { module: 'system', action: 'LOGIN', status: 'success', actor: 'Admin', actorRole: 'Administrator', summary: 'User login successful' },
  {
    module: 'system',
    action: 'LOGIN',
    status: 'failed',
    actor: 'Operator2',
    actorRole: 'Operator',
    summary: 'User login failed',
    detailsText: 'Invalid password. 3 consecutive failed attempts recorded.',
  },
  { module: 'system', action: 'LOGOUT', status: 'success', actor: 'Operator1', actorRole: 'Operator', summary: 'User logged out' },
  { module: 'system', action: 'SERVICE_RESTART', status: 'success', actor: 'System', actorRole: 'System', summary: 'Recording service restarted' },
  {
    module: 'system',
    action: 'SERVICE_RESTART',
    status: 'warning',
    actor: 'System',
    actorRole: 'System',
    summary: 'Database service restarted after timeout',
    detailsText: 'Service did not respond within the 30s threshold; restarted automatically.',
  },
]

const ENTRY_COUNT = 220
// ~3h30m de espaciado -> ~32 días de historial total, suficiente para que Today/Last 7 Days/
// Last 30 Days/Any Time del filtro de fecha tengan resultados distintos entre sí.
const SPACING_MS = 3.5 * 60 * 60 * 1000

export const SYSTEM_LOG_ENTRIES: SystemLogEntry[] = Array.from({ length: ENTRY_COUNT }, (_, i) => {
  const template = TEMPLATES[i % TEMPLATES.length]
  return {
    id: `log-${i + 1}`,
    timestamp: new Date(Date.now() - i * SPACING_MS).toISOString(),
    ...template,
  }
})
