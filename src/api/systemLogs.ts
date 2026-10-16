import { adminFetch, readAdminJson } from './adminSession'
import type { SystemLogActorType, SystemLogEntry, SystemLogGame, SystemLogModule } from '../types/adminSystemLogs'

// GET /audit/system-logs de quick-money-backend (internal/audit/system_logs.go): la tabla log
// completa (usuarios, sistema y máquinas), filtrada y paginada en el backend. Exige sesión de admin:
// sin ella adminFetch lanza AdminAuthError.

interface ApiSystemLog {
  id: number
  createdAt: string
  action: string
  module: string
  actorType: SystemLogActorType
  user?: { id: string; username: string; fullName: string; role: string }
  machine?: { id: number; name: string }
  description: string
  round?: { id: number; code: string }
  game?: { name: string; family: string }
  change?: { field: string; before: string | null; after: string | null }
  targetUser?: { id: string; username: string }
  rtpProfile?: { id: number; name: string; event: string }
}

export interface SystemLogActorOption {
  id: string
  username: string
  role: string
}

interface ApiSystemLogPage {
  items: ApiSystemLog[]
  total: number
  actors: { users: SystemLogActorOption[]; system: boolean; machine: boolean }
}

export interface SystemLogsQuery {
  from?: string
  // uuid de un usuario, 'SYSTEM' o 'MACHINE'
  actor?: string
  module?: SystemLogModule
  action?: string
  search?: string
  limit: number
  offset: number
}

export interface SystemLogsPage {
  entries: SystemLogEntry[]
  total: number
  actors: ApiSystemLogPage['actors']
}

// game_family del backend: 'Roulette' o 'Lottery' (Quick Money).
function gameOf(game: ApiSystemLog['game']): SystemLogGame | null {
  if (!game) return null
  return game.family === 'Roulette' ? 'roulette' : 'quickMoney'
}

function toEntry(log: ApiSystemLog): SystemLogEntry {
  return {
    id: String(log.id),
    timestamp: log.createdAt,
    actorType: log.actorType,
    actor: log.user?.username ?? log.machine?.name ?? '',
    actorRole: log.user?.role ?? '',
    module: log.module.toLowerCase() as SystemLogModule,
    action: log.action,
    summary: log.description || null,
    game: gameOf(log.game),
    roundCode: log.round?.code ?? null,
    targetUser: log.targetUser?.username ?? null,
    rtpProfile: log.rtpProfile ? { name: log.rtpProfile.name, event: log.rtpProfile.event } : null,
    change: log.change ?? null,
  }
}

export async function fetchSystemLogs(query: SystemLogsQuery, signal?: AbortSignal): Promise<SystemLogsPage> {
  const params = new URLSearchParams({ limit: String(query.limit), offset: String(query.offset) })
  if (query.from) params.set('from', query.from)
  if (query.actor) params.set('actor', query.actor)
  if (query.module) params.set('module', query.module.toUpperCase())
  if (query.action) params.set('action', query.action)
  if (query.search) params.set('q', query.search)
  const page = await readAdminJson<ApiSystemLogPage>(await adminFetch(`/audit/system-logs?${params}`, { signal }), 'system logs')
  return { entries: page.items.map(toEntry), total: page.total, actors: page.actors }
}
