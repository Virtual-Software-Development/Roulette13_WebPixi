import type { ResultStatsData } from '../types/resultStats'

// Mock TEMPORAL para ResultStatsPanel mientras no exista una fuente real de "jugadores en ronda" /
// "pozo total" -- reemplazar este archivo por completo (o por el fetch que corresponda) no
// requiere tocar el componente, que solo recibe `data: ResultStatsData` por props.
export const RESULT_STATS_MOCK_DATA: ResultStatsData = {
  activeBets: 128,
  totalPot: 24580,
}
