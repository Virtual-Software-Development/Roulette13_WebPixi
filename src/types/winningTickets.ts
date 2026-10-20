// Resumen y tickets ganadores de un sorteo, para la pantalla que se muestra en el lobby después de
// cada sorteo (WinningTicketsScreen, la monta DrawSummaryHost). Los datos los arma api/drawSummary.ts.

export type WinningTicketGame = 'roulette' | 'pick3' | 'pick4'

export interface WinningTicket {
  // Código impreso, siempre enmascarado en pantalla (solo se ven los últimos dígitos).
  code: string
  game: WinningTicketGame
  // Terminal donde se vendió.
  terminal: string
  // Total cobrado por el ticket (apuesta + premio de todas sus apuestas ganadoras).
  prize: number
}

// Métricas agregadas del sorteo ya liquidado. null = el backend todavía no la publica para el lobby
// (se muestra "Pendiente"), no cero.
export interface DrawSummaryMetrics {
  totalWagered: number | null
  // Apuesta + premio de las apuestas ganadoras (mismo criterio que el backend, roundstats.RoundStats.Paid).
  totalPaid: number | null
  participatingTickets: number | null
  winningTickets: number | null
}

export interface WinningTicketsDraw {
  game: 'roulette' | 'quickMoney'
  // Número del sorteo del día ('0092'), tal cual lo muestra el resto del lobby.
  drawNumber: string
  // Resultado del sorteo tal cual se muestra: '17' / '00' en Roulette, '482' y '9031' en Quick Money.
  result: { roulette?: string; pick3?: string; pick4?: string }
  metrics: DrawSummaryMetrics
  // Ordenados de mayor a menor premio. null = la lista todavía no está disponible para el lobby
  // (distinto de [] = nadie ganó).
  tickets: WinningTicket[] | null
}
