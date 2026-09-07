// Duración del pop de entrada/salida de los diamantes de docena/columna (fase 2 de SpinStatsPanel,
// ver useDozenColumnHighlightEntries) -- mismo criterio que NUMBER_CELL_HIGHLIGHT_ENTER/LEAVE_
// DURATION_MS (fase 1, NumberCellHighlight.tsx), pero un valor propio: acá es un simple fade+scale
// (ver DozenDiamondIndicator.css / ColumnDiamondIndicator.css), no una barra de carga direccional.
export const DIAMOND_INDICATOR_ENTER_DURATION_MS = 200
export const DIAMOND_INDICATOR_LEAVE_DURATION_MS = 200
