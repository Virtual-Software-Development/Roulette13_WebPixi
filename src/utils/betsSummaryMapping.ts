import type { BetsSummaryResponse } from '../types/betsSummary'
import type { LiveTableBetsData, NumberBetTotal } from '../types/liveTableBets'
import type { ResultStatsData } from '../types/resultStats'
import type { WheelPocket } from '../types/wheel'

// Mismo criterio que ya usa LeftStatsSidebar.tsx para su propio "Top 10 Most Bet Numbers" (ordena
// `data.numbers` por total descendente y toma los primeros 10) -- ACÁ se decide qué pockets llevan
// highlighted/showChipStack en LiveTableBetsPanel, así ambos "top 10" (el de la tabla y el del
// sidebar) siempre coinciden sin coordinarse entre sí, por construcción.
const TOP_HIGHLIGHT_COUNT = 10

function parsePocket(key: string): WheelPocket {
  return key === '00' ? '00' : Number(key)
}

// LiveTableBetsPanel/LeftStatsSidebar (reutiliza la misma prop `data`, ver App.tsx) -- highlighted
// y showChipStack van siempre juntos acá (pedido explícito: "con el top 10 debes encender el
// Highlight... con el icono de la moneda").
export function toLiveTableBetsData(response: BetsSummaryResponse): LiveTableBetsData {
  const numbers: NumberBetTotal[] = Object.entries(response.numbers).map(([key, total]) => ({
    pocket: parsePocket(key),
    total,
  }))

  const topPockets = new Set(
    [...numbers]
      .sort((a, b) => b.total - a.total)
      .slice(0, TOP_HIGHLIGHT_COUNT)
      .map((bet) => bet.pocket),
  )
  for (const bet of numbers) {
    if (topPockets.has(bet.pocket)) {
      bet.highlighted = true
      bet.showChipStack = true
    }
  }

  return {
    numbers,
    dozens: {
      firstDozen: response.dozens.first,
      secondDozen: response.dozens.second,
      thirdDozen: response.dozens.third,
    },
    columns: {
      firstColumn: response.columns.column1,
      secondColumn: response.columns.column2,
      thirdColumn: response.columns.column3,
    },
    outside: {
      low: response.outside.low,
      high: response.outside.high,
      even: response.outside.even,
      odd: response.outside.odd,
      red: response.outside.red,
      black: response.outside.black,
    },
  }
}

export function toResultStatsData(response: BetsSummaryResponse): ResultStatsData {
  return {
    activeBets: response.playersCount,
    totalPot: response.totalBetAmount,
  }
}
