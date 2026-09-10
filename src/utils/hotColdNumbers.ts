import type { WheelPocket } from '../types/wheel'
import { toWheelPocket } from './rouletteColors'

export interface HotColdEntry {
  pocket: WheelPocket
  hits: number
  // 0-100, contra el total de spins de la muestra (ver totalSpins) -- no contra el máximo de la
  // propia lista, así que un cold entry con pocos hits siempre da un % chico en términos absolutos.
  percentage: number
}

export interface HotColdNumbers {
  hot: WheelPocket[]
  cold: WheelPocket[]
  // Mismos datos que hot/cold pero con hits/percentage -- usados por NumberPanelHotCold para las
  // barras de frecuencia; hot/cold (solo pockets) se mantienen para HotColdNumberChipLayer, que no
  // necesita más que la lista de números.
  hotEntries: HotColdEntry[]
  coldEntries: HotColdEntry[]
  totalSpins: number
}

// Cuenta ocurrencias por casilla y devuelve las `limit` más frecuentes (hot) y
// las `limit` menos frecuentes (cold). Si hay menos casillas distintas que
// `limit`, cada lista queda con las que haya -- no se rellena con vacíos.
export function computeHotColdNumbers(rawResults: number[], limit = 5): HotColdNumbers {
  const counts = new Map<WheelPocket, number>()
  for (const raw of rawResults) {
    const pocket = toWheelPocket(raw)
    counts.set(pocket, (counts.get(pocket) ?? 0) + 1)
  }

  const totalSpins = rawResults.length
  const toEntry = ([pocket, hits]: [WheelPocket, number]): HotColdEntry => ({
    pocket,
    hits,
    percentage: totalSpins > 0 ? (hits / totalSpins) * 100 : 0,
  })

  const entries = [...counts.entries()]
  const hotEntries = [...entries].sort((a, b) => b[1] - a[1]).slice(0, limit).map(toEntry)
  const coldEntries = [...entries].sort((a, b) => a[1] - b[1]).slice(0, limit).map(toEntry)

  return {
    hot: hotEntries.map((entry) => entry.pocket),
    cold: coldEntries.map((entry) => entry.pocket),
    hotEntries,
    coldEntries,
    totalSpins,
  }
}
