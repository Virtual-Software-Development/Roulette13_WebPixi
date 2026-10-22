// Respuesta cruda de GET /api/bets (msgType:"betsSummary"), y el mismo cuerpo que el backend publica
// en vivo por MQTT (ROULETTE_BETS_TOPIC, ver src/mqtt/topics.ts) -- shape del backend real, separado de
// LiveTableBetsData/ResultStatsData (los tipos que ya consumen los paneles Pixi) porque las claves
// no coinciden 1:1 (ver src/utils/betsSummaryMapping.ts para la conversión).
export interface BetsSummaryResponse {
  msgType: 'betsSummary'
  // Ronda a la que pertenecen los totales (no vienen si no hay ronda).
  eventId?: number
  drawNo?: string
  // Claves "0".."36" y "00" -- WheelPocket como string, ver parsePocket en betsSummaryMapping.ts.
  numbers: Record<string, number>
  columns: {
    column1: number
    column2: number
    column3: number
  }
  dozens: {
    first: number
    second: number
    third: number
  }
  outside: {
    high: number
    low: number
    even: number
    odd: number
    red: number
    black: number
  }
  // Tickets activos de la ronda en toda la flota (todas las terminales y la caja).
  ticketsCount: number
  totalBetAmount: number
  // Cuándo cambiaron los totales por última vez (el último ticket); null sin tickets.
  updatedAt: string | null
}
