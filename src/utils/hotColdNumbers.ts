import type { WheelPocket } from '../types/wheel'

export interface HotColdNumbers {
  hot: WheelPocket[]
  cold: WheelPocket[]
}

// rawResults (ver useResultsStore) reporta 37 para la casilla '00' en vez del
// string que usa WheelPocket -- se traduce acá antes de tallar frecuencias.
function toPocket(raw: number): WheelPocket {
  return raw === 37 ? '00' : raw
}

// Cuenta ocurrencias por casilla y devuelve las `limit` más frecuentes (hot) y
// las `limit` menos frecuentes (cold). Si hay menos casillas distintas que
// `limit`, cada lista queda con las que haya -- no se rellena con vacíos.
export function computeHotColdNumbers(rawResults: number[], limit = 5): HotColdNumbers {
  const counts = new Map<WheelPocket, number>()
  for (const raw of rawResults) {
    const pocket = toPocket(raw)
    counts.set(pocket, (counts.get(pocket) ?? 0) + 1)
  }

  const entries = [...counts.entries()]
  const hot = [...entries].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([pocket]) => pocket)
  const cold = [...entries].sort((a, b) => a[1] - b[1]).slice(0, limit).map(([pocket]) => pocket)

  return { hot, cold }
}
