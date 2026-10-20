import { getRouletteColor, type RouletteColor } from './rouletteColors'
import type { WheelPocket } from '../types/wheel'

// Atributos de un número ganador de Roulette para el resumen del sorteo (WinningTicketsScreen). Los
// grupos de apuesta exterior no incluyen 0 ni 00: para esas casillas cada uno es null ("no aplica"),
// que es justo por qué esas apuestas pierden cuando sale el cero.
export interface RouletteNumberAttributes {
  color: RouletteColor
  // 1ª (1-12), 2ª (13-24), 3ª (25-36).
  dozen: 1 | 2 | 3 | null
  // Columna del paño: 1 = 1, 4, 7 … 34; 2 = 2, 5 … 35; 3 = 3, 6 … 36.
  column: 1 | 2 | 3 | null
  parity: 'even' | 'odd' | null
  // Falta (1-18) / Pasa (19-36).
  range: 'low' | 'high' | null
}

export function getRouletteNumberAttributes(pocket: WheelPocket): RouletteNumberAttributes {
  const color = getRouletteColor(pocket)
  if (pocket === '00' || pocket === 0) return { color, dozen: null, column: null, parity: null, range: null }
  return {
    color,
    dozen: (Math.ceil(pocket / 12) as 1 | 2 | 3),
    column: ((((pocket - 1) % 3) + 1) as 1 | 2 | 3),
    parity: pocket % 2 === 0 ? 'even' : 'odd',
    range: pocket <= 18 ? 'low' : 'high',
  }
}
