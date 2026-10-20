// Resumen y tickets ganadores de un sorteo, para la pantalla que se muestra en el lobby después de
// cada sorteo (WinningTicketsScreen, la monta DrawSummaryHost). Los datos los arma api/drawSummary.ts.

export interface WinningTicket {
  // Código impreso, ya enmascarado por el backend (••••1234): la lista es pública.
  code: string
  // machine.id de la terminal donde se vendió: la que coincide con la propia lo marca como local.
  machineId: number
  // Nombre de esa terminal.
  terminal: string
  // Premio del ticket: suma de bet.prize_amount de sus apuestas ganadoras (sin la apuesta).
  prize: number
}

// Métricas agregadas del sorteo ya liquidado. null = el backend todavía no la publica para el lobby
// (se muestra "Pendiente"), no cero.
export interface DrawSummaryMetrics {
  totalWagered: number | null
  // Suma de los premios (bet.prize_amount) de los tickets ganadores, sin las apuestas: la da GET /winners.
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
  // false mientras siguen llegando páginas (api/drawWinners.ts): [] con false es "cargando", no "nadie
  // ganó". Sin el campo, la lista está completa.
  ticketsComplete?: boolean
}
