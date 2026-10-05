import { adminFetch } from './adminSession'

// Endpoints de admin de quick-money-backend para Next Results > Roulette (requieren sesión de
// admin, ver adminSession.ts).

export interface RoulettePendingEvent {
  id: number
  numeroEvento: string
  horaProgramada: string
  horaCierreApuestas: string
  horaCongelacion: string
  estado: 'sugerido' | 'congelado'
}

// RouletteRTPSnapshot del backend (internal/events/rtp_snapshot.go).
export interface RouletteRTPSnapshot {
  eventId: number
  takenAt: string
  motor: string
  manual: boolean
  rtpActual: number | null
  // RTP de la ventana que dejaría cada número ("0", "00", "1".."36") si saliera; null si no hay
  // nada apostado todavía.
  rtpResultantePorNumero: Record<string, number> | null
  // Número con el que corrió el evento -- el backend lo deja en null hasta ejecutarlo (T-2s).
  numeroElegido?: string | null
}

export interface RouletteNextResult {
  event: RoulettePendingEvent
  snapshot: RouletteRTPSnapshot | null
  // 'congelacion': el snapshot que se tomó al congelar (apuestas finales); 'en_vivo': calculado
  // ahora con las apuestas hasta el momento (antes de congelar).
  fuente: 'congelacion' | 'en_vivo'
  // Resultado definitivo (lectura auditada en el backend) -- null mientras sea provisional.
  numeroPendiente: string | null
  // Último momento en que el backend acepta cambiar el resultado (T-30s).
  sustitucionHasta: string
}

// Lo que necesita el panel: el resultado + el monto apostado a cada número (fetchBetsByNumber).
export interface RouletteNextResultView extends RouletteNextResult {
  betsByNumber: Record<string, number> | null
}

async function readJson<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) {
    let message = `${what} failed: ${res.status}`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // cuerpo no-JSON: queda el status
    }
    throw new Error(message)
  }
  return res.json()
}

// Monto apostado a pleno por número ("0", "00", "1".."36") en la ronda pendiente -- /api/bets es
// público (el mismo que alimenta Live Bets del lobby). Las apuestas de varios números (caballo,
// calle, esquina...) no aparecen acá: el backend no las reparte por número.
export async function fetchBetsByNumber(): Promise<Record<string, number>> {
  const res = await fetch('/api/bets')
  const data = await readJson<{ numbers?: Record<string, number> }>(res, 'bets summary')
  return data.numbers ?? {}
}

export async function fetchCurrentRouletteEvent(): Promise<RoulettePendingEvent | null> {
  const res = await adminFetch('/events/roulette/current')
  if (res.status === 404) return null
  return readJson(res, 'current roulette event')
}

export async function fetchRouletteNextResult(eventId: number): Promise<RouletteNextResult> {
  return readJson(await adminFetch(`/events/${eventId}/rtp-snapshot`), 'roulette RTP snapshot')
}

export async function substituteRouletteResult(eventId: number, resultado: string, motivo: string): Promise<void> {
  const res = await adminFetch(`/events/${eventId}/substitute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resultado, motivo }),
  })
  if (res.status === 204) return
  await readJson(res, 'substitute roulette result')
}
