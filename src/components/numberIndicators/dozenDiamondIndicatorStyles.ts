import type { DozenGroup } from '../../types/numberIndicator'

export interface DozenDiamondIndicatorStyle {
  stroke: string
  glow: string
}

// Paleta placeholder -- un color bien diferenciable por docena, a reemplazar por los
// colores finales cuando estén definidos.
export const DOZEN_DIAMOND_INDICATOR_STYLES: Record<DozenGroup, DozenDiamondIndicatorStyle> = {
  firstDozen: { stroke: '#f5b942', glow: '#f5b942' },
  secondDozen: { stroke: '#5ab4f0', glow: '#5ab4f0' },
  thirdDozen: { stroke: '#b083f5', glow: '#b083f5' },
}
