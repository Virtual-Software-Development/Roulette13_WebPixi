import type { WheelPocket } from '../types/wheel'

export type RouletteParity = 'even' | 'odd'
export type RouletteRange = 'low' | 'high'

// Misma regla que computeSpinStats (spinStats.ts): 0/'00' no tiene paridad.
export function getRouletteParity(pocket: WheelPocket): RouletteParity | null {
  if (pocket === '00' || pocket === 0) return null
  return pocket % 2 === 0 ? 'even' : 'odd'
}

// Misma regla que computeSpinStats (spinStats.ts): 0/'00' no tiene rango alto/bajo.
export function getRouletteRange(pocket: WheelPocket): RouletteRange | null {
  if (pocket === '00' || pocket === 0) return null
  return pocket <= 18 ? 'low' : 'high'
}
