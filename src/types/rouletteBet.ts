import type { WheelPocket } from './wheel'
import type { ColumnGroup, DozenGroup } from './numberIndicator'

export type InsideBetType = 'straightUp' | 'split' | 'street' | 'corner' | 'sixLine' | 'trio'
export type OutsideBetType = 'column' | 'dozen' | 'redBlack' | 'oddEven' | 'highLow'
export type BetType = InsideBetType | OutsideBetType

export type RedBlackChoice = 'red' | 'black'
export type OddEvenChoice = 'odd' | 'even'
export type HighLowChoice = 'low' | 'high'

// Fuente única de verdad de "qué números componen esta apuesta" -- cada variante trae sus propios
// `pockets` ya resueltos (nunca se recalculan aparte en el board, el bet slip o el payout). El
// campo "humano" (group/color/parity/range) es solo para poder etiquetar la UI sin tener que
// derivarlo de vuelta a partir de los pockets.
export type BetSelection =
  | { type: 'straightUp'; pockets: [WheelPocket] }
  // pockets es WheelPocket (no number): split cubre pares comunes (17/20) pero también los que
  // incluyen 0/00 (0-1, 0-2, 00-2, 00-3, 0-00) -- ver zona "0/00" en rouletteBetZones.ts.
  | { type: 'split'; pockets: [WheelPocket, WheelPocket] }
  // Apuesta de 3 números propia del área 0/00 (0-1-2, 00-2-3, 0-00-2) -- pago 11:1, igual que
  // Street, pero se modela aparte porque sus números no son "una calle" (no vienen de
  // getColumnGroupPockets) y pueden incluir '00'.
  | { type: 'trio'; pockets: [WheelPocket, WheelPocket, WheelPocket] }
  | { type: 'street'; pockets: [number, number, number] }
  | { type: 'corner'; pockets: [number, number, number, number] }
  | { type: 'sixLine'; pockets: [number, number, number, number, number, number] }
  | { type: 'column'; group: ColumnGroup; pockets: number[] }
  | { type: 'dozen'; group: DozenGroup; pockets: number[] }
  | { type: 'redBlack'; color: RedBlackChoice; pockets: number[] }
  | { type: 'oddEven'; parity: OddEvenChoice; pockets: number[] }
  | { type: 'highLow'; range: HighLowChoice; pockets: number[] }
