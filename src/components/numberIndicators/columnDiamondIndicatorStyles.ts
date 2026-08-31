import type { ColumnGroup } from '../../types/numberIndicator'

export interface ColumnDiamondIndicatorStyle {
  stroke: string
  glow: string
}

// Paleta placeholder -- un color bien diferenciable por columna, a reemplazar por los
// colores finales cuando estén definidos.
export const COLUMN_DIAMOND_INDICATOR_STYLES: Record<ColumnGroup, ColumnDiamondIndicatorStyle> = {
  firstColumn: { stroke: '#f5b942', glow: '#f5b942' },
  secondColumn: { stroke: '#5ab4f0', glow: '#5ab4f0' },
  thirdColumn: { stroke: '#b083f5', glow: '#b083f5' },
}
