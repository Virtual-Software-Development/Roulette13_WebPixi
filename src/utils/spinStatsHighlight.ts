import { getWheelOrder } from '../data/wheelOrder'
import { getRouletteColor } from './rouletteColors'
import { getDozenGroupPockets } from './dozenGroups'
import { getColumnGroupPockets } from './columnGroups'
import type { Phase1Category } from '../hooks/useSpinStatsCycle'
import type { DozenGroup, ColumnGroup } from '../types/numberIndicator'
import type { WheelPocket, WheelType } from '../types/wheel'

// Casillas de la rueda que corresponden a cada categoría de la fase 1 del ciclo de SpinStatsPanel
// (ver useSpinStatsCycle) -- 0/'00' quedan afuera de even/odd/high/low (no las define ninguna),
// igual criterio que computeSpinStats.
export function getPocketsForCategory(category: Phase1Category, wheelType: WheelType): WheelPocket[] {
  const pockets = getWheelOrder(wheelType)

  switch (category) {
    case 'red':
      return pockets.filter((pocket) => getRouletteColor(pocket) === 'red')
    case 'black':
      return pockets.filter((pocket) => getRouletteColor(pocket) === 'black')
    case 'even':
      return pockets.filter((pocket): pocket is number => typeof pocket === 'number' && pocket !== 0 && pocket % 2 === 0)
    case 'odd':
      return pockets.filter((pocket): pocket is number => typeof pocket === 'number' && pocket % 2 === 1)
    case 'high':
      return pockets.filter((pocket): pocket is number => typeof pocket === 'number' && pocket >= 19 && pocket <= 36)
    case 'low':
      return pockets.filter((pocket): pocket is number => typeof pocket === 'number' && pocket >= 1 && pocket <= 18)
  }
}

// Casillas de la rueda para una docena/columna de la fase 2 -- getDozenGroupPockets/
// getColumnGroupPockets ya dan la lista completa (matemática, no depende del orden físico), acá
// se reordena según el orden físico real de la rueda (ver getWheelOrder) para que el acordeón de
// entrada/salida (useDozenColumnHighlightEntries) recorra la rueda en orden en vez de saltar.
export function getPocketsForDozenGroup(group: DozenGroup, wheelType: WheelType): number[] {
  const members = new Set(getDozenGroupPockets(group))
  return getWheelOrder(wheelType).filter((pocket): pocket is number => typeof pocket === 'number' && members.has(pocket))
}

export function getPocketsForColumnGroup(group: ColumnGroup, wheelType: WheelType): number[] {
  const members = new Set(getColumnGroupPockets(group))
  return getWheelOrder(wheelType).filter((pocket): pocket is number => typeof pocket === 'number' && members.has(pocket))
}
