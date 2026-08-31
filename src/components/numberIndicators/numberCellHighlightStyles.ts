import type { RouletteColor } from '../../utils/rouletteColors'

export interface NumberCellHighlightStyle {
  fill: string
  glow: string
}

// Negro se pinta blanco (no el negro real) para tener contraste sobre la casilla oscura.
// glow es el color del halo de las líneas laterales (ver NumberCellHighlight.tsx) -- separado
// de fill para poder darle un tono distinto al glow sin afectar el relleno.
export const NUMBER_CELL_HIGHLIGHT_STYLES: Record<RouletteColor, NumberCellHighlightStyle> = {
  red: { fill: '#eea744', glow: '#eea744' },
  black: { fill: '#ffffff', glow: '#ffffff' },
  green: { fill: '#3ddc73', glow: '#3ddc73' },
}
