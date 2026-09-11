// Datos del mini-dashboard de estadísticas (ResultStatsPanel) -- deliberadamente separado de
// LiveTableBetsData (types/liveTableBets.ts): son dos componentes independientes que solo
// comparten el mismo gatillo de visibilidad (useDrawCycleStore.active), nunca una fuente de datos.
export interface ResultStatsData {
  activeBets: number
  totalPot: number
}
