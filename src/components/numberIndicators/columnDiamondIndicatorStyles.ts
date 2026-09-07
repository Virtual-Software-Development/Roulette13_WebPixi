import type { ColumnGroup } from '../../types/numberIndicator'
import { FIRST_GROUP_COLOR, SECOND_GROUP_COLOR, THIRD_GROUP_COLOR, numberToCssHex } from '../../utils/spinStatsColors'

export interface ColumnDiamondIndicatorStyle {
  stroke: string
  glow: string
}

// Mismo trío que SPIN_STATS_CATEGORY_COLOR (ver spinStatsColors.ts) -- así el anillo de la dona de
// columnas en SpinStatsPanel y estos diamantes sobre la rueda siempre coinciden en color.
const FIRST_HEX = numberToCssHex(FIRST_GROUP_COLOR)
const SECOND_HEX = numberToCssHex(SECOND_GROUP_COLOR)
const THIRD_HEX = numberToCssHex(THIRD_GROUP_COLOR)

export const COLUMN_DIAMOND_INDICATOR_STYLES: Record<ColumnGroup, ColumnDiamondIndicatorStyle> = {
  firstColumn: { stroke: FIRST_HEX, glow: FIRST_HEX },
  secondColumn: { stroke: SECOND_HEX, glow: SECOND_HEX },
  thirdColumn: { stroke: THIRD_HEX, glow: THIRD_HEX },
}
