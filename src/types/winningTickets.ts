// Tickets ganadores de un sorteo, para la pantalla que los recorre en el lobby (WinningTicketsScreen).
// Todavía no hay endpoint en el backend ni está montada en el lobby (ver los tiempos del ciclo en
// config/quickMoneyLobbyCycle.ts antes de hacerlo).

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

export interface WinningTicketsDraw {
  game: 'roulette' | 'quickMoney'
  drawNumber: number
  // Resultado del sorteo tal cual se muestra: '17' / '00' en Roulette, '482' y '9031' en Quick Money.
  result: { roulette?: string; pick3?: string; pick4?: string }
  // Ordenados de mayor a menor premio.
  tickets: WinningTicket[]
}
