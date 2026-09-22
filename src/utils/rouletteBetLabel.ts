import type { BetSelection, BetType } from '../types/rouletteBet'
import { pocketSortValue } from './rouletteBetZones'

type Translate = (key: string) => string

// Único lugar que formatea "qué apuesta es esta" para humanos -- usado tanto por
// SelectedBetsList como por TicketPreviewModal, para no duplicar el mapeo bet type -> texto en
// dos componentes distintos.
export function getBetTypeLabel(betType: BetType, t: Translate): string {
  return t(`bettingView.selectedBets.betLabel.${betType}`)
}

function sortedRange(pockets: number[]): string {
  const sorted = [...pockets].sort((a, b) => a - b)
  return `${sorted[0]}-${sorted[sorted.length - 1]}`
}

export function getBetSelectionDescription(selection: BetSelection, t: Translate): string {
  switch (selection.type) {
    case 'straightUp':
      return String(selection.pockets[0])
    case 'split':
    case 'trio':
    case 'street':
    case 'corner':
    case 'sixLine':
      return [...selection.pockets].sort((a, b) => pocketSortValue(a) - pocketSortValue(b)).join('/')
    case 'column':
    case 'dozen':
      return sortedRange(selection.pockets)
    case 'redBlack':
      return t(`bettingView.board.outside.${selection.color}`)
    case 'oddEven':
      return t(`bettingView.board.outside.${selection.parity}`)
    case 'highLow':
      return t(`bettingView.board.outside.${selection.range}`)
  }
}
