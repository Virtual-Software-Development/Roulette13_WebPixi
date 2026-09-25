import type { QuickMoneyGameType } from '../types/quickMoneyBet'
import { QUICK_MONEY_DIGIT_COUNT } from '../types/quickMoneyBet'
import type { QuickMoneyLobbyDraw } from '../data/quickMoneyLobbyMockData'
import { resultFor } from '../data/quickMoneyLobbyMockData'

export interface QuickMoneyHotCold {
  hot: number[]
  cold: number[]
}

// Mismo espíritu que utils/hotColdNumbers.ts (Roulette: cuenta ocurrencias, ordena, recorta a
// `limit`), pero sobre dígitos 0-9 de cada sorteo de Quick Money en vez de casillas de la rueda --
// dominios distintos, no hay store/servicio compartido para reutilizar (ver investigación). Cuenta
// SOLO sobre `draws` (el mismo historial mock que alimenta Recent Results, pedido explícito) --
// con una muestra tan chica el resultado es puramente ilustrativo, no estadísticamente real.
function computeForGame(draws: QuickMoneyLobbyDraw[], gameType: QuickMoneyGameType): QuickMoneyHotCold {
  const counts = new Map<number, number>()
  for (let digit = 0; digit <= 9; digit++) counts.set(digit, 0)
  for (const draw of draws) {
    for (const digit of resultFor(draw, gameType)) {
      counts.set(digit, (counts.get(digit) ?? 0) + 1)
    }
  }

  const limit = QUICK_MONEY_DIGIT_COUNT[gameType]
  const entries = [...counts.entries()]
  const hot = [...entries].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([digit]) => digit)
  const cold = [...entries].sort((a, b) => a[1] - b[1]).slice(0, limit).map(([digit]) => digit)

  return { hot, cold }
}

export function computeQuickMoneyHotCold(draws: QuickMoneyLobbyDraw[]): Record<QuickMoneyGameType, QuickMoneyHotCold> {
  return {
    pick3: computeForGame(draws, 'pick3'),
    pick4: computeForGame(draws, 'pick4'),
  }
}
