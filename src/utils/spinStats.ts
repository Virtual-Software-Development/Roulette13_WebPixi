import { getRouletteColor, type RouletteColor } from './rouletteColors'
import type { DozenGroup, ColumnGroup } from '../types/numberIndicator'
import type { WheelPocket } from '../types/wheel'

// rawResults (ver useResultsStore) reporta 37 para la casilla '00' -- se traduce acá antes de
// clasificar, mismo criterio que hotColdNumbers.ts.
function toPocket(raw: number): WheelPocket {
  return raw === 37 ? '00' : raw
}

export interface SpinStats {
  // Cuántos spins entraron realmente en el cálculo -- puede ser menor al límite pedido si
  // todavía no hay tanto historial (rawResults recién cargando). Es el denominador de todos los
  // porcentajes, incluido el "hueco" de 0/00 en los gráficos que no los cuentan en ninguna
  // categoría (par/impar, alto/bajo, docena, columna).
  sampleSize: number
  color: Record<RouletteColor, number>
  evenOdd: { even: number; odd: number }
  highLow: { low: number; high: number }
  dozen: Record<DozenGroup, number>
  column: Record<ColumnGroup, number>
}

// Talla los últimos `limit` spins de rawResults (rawResults[0] = spin más reciente) en las
// categorías que necesita SpinStatsPanel. 0/'00' cuenta para `color` (verde) pero queda afuera
// de par/impar, alto/bajo, docena y columna -- esas categorías no lo definen.
export function computeSpinStats(rawResults: number[], limit: number): SpinStats {
  const sample = rawResults.slice(0, limit)

  const color: Record<RouletteColor, number> = { red: 0, black: 0, green: 0 }
  const evenOdd = { even: 0, odd: 0 }
  const highLow = { low: 0, high: 0 }
  const dozen: Record<DozenGroup, number> = { firstDozen: 0, secondDozen: 0, thirdDozen: 0 }
  const column: Record<ColumnGroup, number> = { firstColumn: 0, secondColumn: 0, thirdColumn: 0 }

  for (const raw of sample) {
    const pocket = toPocket(raw)
    color[getRouletteColor(pocket)] += 1

    if (pocket === '00' || pocket === 0) continue

    evenOdd[pocket % 2 === 0 ? 'even' : 'odd'] += 1
    highLow[pocket <= 18 ? 'low' : 'high'] += 1
    dozen[pocket <= 12 ? 'firstDozen' : pocket <= 24 ? 'secondDozen' : 'thirdDozen'] += 1

    const columnRemainder = pocket % 3
    column[columnRemainder === 1 ? 'firstColumn' : columnRemainder === 2 ? 'secondColumn' : 'thirdColumn'] += 1
  }

  return { sampleSize: sample.length, color, evenOdd, highLow, dozen, column }
}
