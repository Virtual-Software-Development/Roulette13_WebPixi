// Respuesta cruda de GET /api/bets (msgType:"betsSummary") -- shape del backend real, separado de
// LiveTableBetsData/ResultStatsData (los tipos que ya consumen los paneles Pixi) porque las claves
// no coinciden 1:1 (ver src/utils/betsSummaryMapping.ts para la conversión).
export interface BetsSummaryResponse {
  msgType: 'betsSummary'
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
  playersCount: number
  totalBetAmount: number
}
