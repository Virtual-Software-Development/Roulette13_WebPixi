import { env } from '../config/env'

// What the roulette and Quick Money betting pages share to send a ticket (POST /api/tickets) as
// this PC's terminal, authenticated with env.terminalToken (VITE_TERMINAL_TOKEN).

// One bet as the ticket API takes it: betType is the backend's bet_type code ("straight",
// "red_black", "box"...), selection what it is on ("17", "red", "123").
export interface TicketBet {
  betType: string
  selection: string
  amount: number
}

// The draw currently open for betting (GET /api/events/{roulette|lottery}/current).
export interface CurrentEvent {
  id: number
  juego: string
  numeroEvento: string
  horaProgramada: string
  horaCierreApuestas: string
  estado: string
}

export function newTicketCode(): string {
  const random = Math.floor(Math.random() * 36 ** 4).toString(36).padStart(4, '0')
  return `T${Date.now().toString(36)}${random}`.toUpperCase()
}

export async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return body?.error ?? body?.message ?? `HTTP ${res.status}`
  } catch {
    return `HTTP ${res.status}`
  }
}

// Returns the event of juego open for betting, or null when there is none right now (404).
export async function fetchCurrentEvent(juego: 'roulette' | 'lottery'): Promise<CurrentEvent | null> {
  const res = await fetch(`/api/events/${juego}/current`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`could not read the current ${juego} event: ${await errorMessage(res)}`)
  return res.json()
}

// Sends one ticket. Throws with the backend's message if it is rejected.
export async function postTicket(game: 'roulette' | 'quick_money', eventId: number, bets: TicketBet[], ticketCode = newTicketCode()): Promise<void> {
  if (!env.terminalToken) {
    throw new Error('VITE_TERMINAL_TOKEN is not set: this PC has no terminal token to send tickets with')
  }
  const res = await fetch('/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Terminal-Token': env.terminalToken },
    body: JSON.stringify({ game, ticketCode, eventId, bets }),
  })
  if (!res.ok) throw new Error(`ticket rejected: ${await errorMessage(res)}`)
}
