import { adminFetch, readAdminJson as readJson } from './adminSession'

// Endpoints de quick-money-backend para Next Results > Quick Money -- solo admin (con sesión); el
// backend audita quién leyó o cambió el resultado.

export interface QuickMoneyPendingEvent {
  id: number
  numeroEvento: string
  horaProgramada: string
  horaCierreApuestas: string
  horaCongelacion: string
  estado: 'sugerido' | 'congelado'
}

// El resultado de un sorteo de Quick Money se decide al crearlo (la congelación no lo cambia), así
// que siempre es el definitivo. Nada de apuestas: el admin no ve las de un sorteo todavía abierto.
export interface QuickMoneyNextResult {
  event: QuickMoneyPendingEvent
  // Resultado pendiente (lectura auditada en el backend); null si el sorteo todavía no tiene.
  pick3: string | null
  pick4: string | null
  // Último momento en que el backend acepta cambiar el resultado.
  sustitucionHasta: string
}

export async function fetchCurrentQuickMoneyEvent(): Promise<QuickMoneyPendingEvent | null> {
  const res = await adminFetch('/events/lottery/current')
  if (res.status === 404) return null
  return readJson(res, 'current Quick Money draw')
}

export async function fetchQuickMoneyNextResult(eventId: number): Promise<QuickMoneyNextResult> {
  return readJson(await adminFetch(`/events/${eventId}/lottery-next-result`), 'Quick Money next result')
}

// resultado = los 7 dígitos del sorteo: los 3 del Pick 3 seguidos de los 4 del Pick 4.
export async function substituteQuickMoneyResult(eventId: number, pick3: string, pick4: string, motivo: string): Promise<void> {
  const res = await adminFetch(`/events/${eventId}/substitute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resultado: pick3 + pick4, motivo }),
  })
  if (res.status === 204) return
  await readJson(res, 'substitute Quick Money result')
}
