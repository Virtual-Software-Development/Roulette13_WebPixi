import type { WheelPocket } from './wheel'
import type { DozenGroup, ColumnGroup } from './numberIndicator'

// 100% data-driven: `highlighted`/`showChipStack` son decididos por quien produce estos datos
// (fuente externa de apuestas), nunca por el panel -- ver LiveTableBetsPanel.tsx, que solo
// pregunta `if (highlighted)`, jamás compara pockets/montos entre sí.
export interface NumberBetTotal {
  pocket: WheelPocket
  total: number
  highlighted?: boolean
  showChipStack?: boolean
}

export interface OutsideBetTotals {
  low?: number // 1 to 18
  even?: number
  red?: number
  black?: number
  odd?: number
  high?: number // 19 to 36
}

export interface LiveTableBetsData {
  numbers: NumberBetTotal[]
  dozens?: Partial<Record<DozenGroup, number>>
  columns?: Partial<Record<ColumnGroup, number>>
  outside?: OutsideBetTotals
}
