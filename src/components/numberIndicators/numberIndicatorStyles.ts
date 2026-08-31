import type { NumberIndicatorType } from '../../types/numberIndicator'

export interface NumberIndicatorStyle {
  fill: string
  stroke: string
}

// Un tipo nuevo (p. ej. 'repeated', 'suggested') se agrega acá — ni HotColdNumberChip
// ni HotColdNumberChipLayer necesitan tocarse.
export const NUMBER_INDICATOR_STYLES: Record<NumberIndicatorType, NumberIndicatorStyle> = {
  hot: { fill: '#c9791a', stroke: '#f5b942' },
  cold: { fill: '#1f5fa8', stroke: '#5ab4f0' },
}
