import type { StatusBadgeVariant } from './rtpDashboard'

// Módulos administrativos reales del proyecto (ver ADMIN_SIDEBAR_ITEMS en adminDashboardMockData.ts)
// -- deliberadamente NO incluye "payouts" (existía en la captura de referencia pero no hay ninguna
// sección Payouts en este Admin Panel todavía, así que no hay nada real que ese módulo representaría).
export type SystemLogModule = 'roulette' | 'quickMoney' | 'rtp' | 'users' | 'events' | 'videos' | 'reports' | 'settings' | 'system'

export type SystemLogStatus = 'success' | 'warning' | 'failed'

// Códigos de acción tipo audit-trail (CHANGE_RESULT, CREATE_EVENT, ...) -- se muestran tal cual en
// la UI, sin pasar por i18n (mismo criterio que `filename`/`uploadedBy` en UploadHistoryRecord: son
// datos, no copy de interfaz).
export type SystemLogAction =
  | 'CHANGE_RESULT'
  | 'CREATE_EVENT'
  | 'UPDATE_EVENT'
  | 'DELETE_EVENT'
  | 'UPDATE_RTP_TARGET'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'DEACTIVATE_USER'
  | 'UPLOAD_VIDEO'
  | 'REPLACE_VIDEO'
  | 'RESCAN_LIBRARY'
  | 'GENERATE_REPORT'
  | 'UPDATE_SETTINGS'
  | 'LOGIN'
  | 'LOGOUT'
  | 'SERVICE_RESTART'

// Solo se completa cuando el log representa un cambio de valor puntual (pedido explícito: "no
// inventar diff functionality que no exista" -- por eso es opcional, no todas las acciones tienen
// before/after real, ej. LOGIN o GENERATE_REPORT no cambian ningún campo).
export interface SystemLogChange {
  fieldLabel: string
  before: string
  after: string
}

export interface SystemLogEntry {
  id: string
  timestamp: string
  actor: string
  actorRole: string
  module: SystemLogModule
  action: SystemLogAction
  summary: string
  status: SystemLogStatus
  change?: SystemLogChange
  // Texto largo para el modal (item "Details" de la referencia) -- cuando no hay nada más que
  // agregar más allá del summary de la tabla, cae al mismo texto (nunca queda vacío/[object Object]).
  detailsText?: string
}

export const SYSTEM_LOG_STATUS_VARIANT: Record<SystemLogStatus, StatusBadgeVariant> = {
  success: 'positive',
  warning: 'warning',
  failed: 'danger',
}

// create/info -> blue, update -> green, destructive -> red, system/automatizado -> purple,
// autenticación -> neutral (categorías conceptuales pedidas explícitamente, mapeadas a los mismos
// 6 variants que ya usa StatusBadge en el resto del Admin, sin introducir colores nuevos).
export const SYSTEM_LOG_ACTION_VARIANT: Record<SystemLogAction, StatusBadgeVariant> = {
  CHANGE_RESULT: 'warning',
  CREATE_EVENT: 'info',
  UPDATE_EVENT: 'positive',
  DELETE_EVENT: 'danger',
  UPDATE_RTP_TARGET: 'positive',
  CREATE_USER: 'info',
  UPDATE_USER: 'positive',
  DEACTIVATE_USER: 'danger',
  UPLOAD_VIDEO: 'info',
  REPLACE_VIDEO: 'positive',
  RESCAN_LIBRARY: 'purple',
  GENERATE_REPORT: 'purple',
  UPDATE_SETTINGS: 'positive',
  LOGIN: 'neutral',
  LOGOUT: 'neutral',
  SERVICE_RESTART: 'purple',
}

export const SYSTEM_LOG_MODULES: SystemLogModule[] = ['roulette', 'quickMoney', 'rtp', 'users', 'events', 'videos', 'reports', 'settings', 'system']

export const SYSTEM_LOG_ACTIONS: SystemLogAction[] = [
  'CHANGE_RESULT',
  'CREATE_EVENT',
  'UPDATE_EVENT',
  'DELETE_EVENT',
  'UPDATE_RTP_TARGET',
  'CREATE_USER',
  'UPDATE_USER',
  'DEACTIVATE_USER',
  'UPLOAD_VIDEO',
  'REPLACE_VIDEO',
  'RESCAN_LIBRARY',
  'GENERATE_REPORT',
  'UPDATE_SETTINGS',
  'LOGIN',
  'LOGOUT',
  'SERVICE_RESTART',
]
