// Mirrors internal/audit/model.go. Event History and Audit Log are two filtered views over the
// same system_events table (see that package's doc comment) -- same shape either way.
export interface SystemEventApi {
  id: number
  createdAt: string
  eventType: string
  module: string
  userId?: string
  eventId?: number
  status: string
  ipAddress?: string
  details?: Record<string, unknown>
}

export interface AlertApi {
  id: number
  tipo: string
  fuente: string
  severidad: 'critical' | 'warning' | 'info' | string
  estado: string
  asignadoA?: string
  descripcion: string
  eventId?: number
  createdAt: string
}
