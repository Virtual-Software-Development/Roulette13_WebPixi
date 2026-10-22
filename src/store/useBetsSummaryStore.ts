import { create } from 'zustand'
import type { LiveTableBetsData } from '../types/liveTableBets'
import type { ResultStatsData } from '../types/resultStats'

// Datos reales de /api/bets, pedidos 10s antes de que arranque el video (ver BETS_LEAD_MS en
// App.tsx) y compartidos por LiveTableBetsPanel/LeftStatsSidebar (misma prop `data`, no una copia
// por panel) y ResultStatsPanel (su propia forma, ver resultStatsData). null hasta el primer fetch
// exitoso -- App.tsx cae a los mocks mientras tanto.
interface BetsSummaryState {
  liveTableBetsData: LiveTableBetsData | null
  resultStatsData: ResultStatsData | null
  // Los totales son de toda la flota: con la conexión caída dejan de ser confiables (puede haber
  // apuestas nuevas que no llegaron, o la ronda ya cambió), así que los paneles se ocultan hasta
  // que llegue un resumen nuevo. Lo marca staleGlobalData.ts al perder la conexión.
  stale: boolean
  markStale: () => void
  setBetsSummary: (data: { liveTableBetsData: LiveTableBetsData; resultStatsData: ResultStatsData }) => void
  // Apaga highlighted/showChipStack de todos los números SIN borrar los totales -- pedido
  // explícito: "cuando se oculte apagas el highlight y apagas la moneda también". Se llama cuando
  // `active` pasa a false (ver App.tsx), justo cuando el video termina y los paneles empiezan a
  // desvanecerse.
  clearHighlights: () => void
}

export const useBetsSummaryStore = create<BetsSummaryState>((set, get) => ({
  liveTableBetsData: null,
  resultStatsData: null,
  stale: false,
  markStale: () => set({ stale: true }),
  setBetsSummary: ({ liveTableBetsData, resultStatsData }) => set({ liveTableBetsData, resultStatsData, stale: false }),
  clearHighlights: () => {
    const current = get().liveTableBetsData
    if (!current) return
    set({
      liveTableBetsData: {
        ...current,
        numbers: current.numbers.map((bet) => ({ ...bet, highlighted: false, showChipStack: false })),
      },
    })
  },
}))
