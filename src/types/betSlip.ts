import type { BetSelection, BetType } from './rouletteBet'

// Una fila del bet slip -- `zoneId` es la misma clave que produce buildZoneId() (ver
// utils/rouletteBetZones.ts) para la selección, así el board y el store nunca pueden
// desincronizarse sobre "qué apuesta es esta". Un solo entry por zoneId: clicks repetidos sobre
// la misma zona suman a `stake` en vez de crear filas duplicadas (ver useBetSlipStore.addBet).
export interface BetSlipEntry {
  zoneId: string
  betType: BetType
  selection: BetSelection
  stake: number
}
