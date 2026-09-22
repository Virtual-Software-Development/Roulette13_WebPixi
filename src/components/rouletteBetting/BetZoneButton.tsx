import { useTranslation } from 'react-i18next'
import type { BetZone } from '../../utils/rouletteBetZones'
import type { BetSlipEntry } from '../../types/betSlip'
import { getRouletteColor } from '../../utils/rouletteColors'
import { formatMoney } from '../../utils/moneyFormat'
import { useBetSlipStore } from '../../store/useBetSlipStore'
import { DiamondIcon } from './icons'

interface BetZoneButtonProps {
  zone: BetZone
  entry: BetSlipEntry | undefined
  disabled: boolean
  onHoverChange: (zone: BetZone | null) => void
  // Solo aplica a zonas straightUp -- true cuando el mouse está sobre un Split/Street/Corner/Six
  // Line (en otra zona) que incluye este pocket (ver BettingBoard.tsx).
  crossHighlighted: boolean
}

const DOZEN_LABEL_KEY: Record<string, string> = {
  firstDozen: 'first',
  secondDozen: 'second',
  thirdDozen: 'third',
}

// Split/Street/Corner/Six Line no llevan label propio -- son franjas de hit-area sobre el borde
// compartido (ver rouletteBetZones.ts), el feedback de "qué apuesta es esta" se da con el hover
// (className bet-zone--<betType>, ver bettingBoard.css) en vez de texto superpuesto al grid.
function useZoneLabel(zone: BetZone): string | null {
  const { t } = useTranslation()
  switch (zone.selection.type) {
    case 'straightUp':
      return String(zone.selection.pockets[0])
    case 'column':
      return t('bettingView.board.column2to1')
    case 'dozen':
      return t(`bettingView.board.dozen.${DOZEN_LABEL_KEY[zone.selection.group]}`)
    case 'redBlack':
      return t(`bettingView.board.outside.${zone.selection.color}`)
    case 'oddEven':
      return t(`bettingView.board.outside.${zone.selection.parity}`)
    case 'highLow':
      return t(`bettingView.board.outside.${zone.selection.range}`)
    default:
      return null
  }
}

export function BetZoneButton({ zone, entry, disabled, onHoverChange, crossHighlighted }: BetZoneButtonProps) {
  const label = useZoneLabel(zone)
  const addBet = useBetSlipStore((state) => state.addBet)

  const pocketColor = zone.selection.type === 'straightUp' ? getRouletteColor(zone.selection.pockets[0]) : null
  // Red/Black outside cell -- mismo criterio de clase que straightUp (bet-zone--color-<color>),
  // así el tinte de fondo no depende únicamente del texto del label.
  const outsideColor = zone.selection.type === 'redBlack' ? zone.selection.color : null

  const className = [
    'bet-zone',
    `bet-zone--${zone.betType}`,
    pocketColor ? `bet-zone--color-${pocketColor}` : '',
    outsideColor ? `bet-zone--color-${outsideColor}` : '',
    zone.kind === 'outside' ? 'bet-zone--outside' : 'bet-zone--inside',
    crossHighlighted ? 'bet-zone--cross-highlighted' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={className}
      style={{
        gridColumn: `${zone.gridArea.colStart} / ${zone.gridArea.colEnd}`,
        gridRow: `${zone.gridArea.rowStart} / ${zone.gridArea.rowEnd}`,
      }}
      disabled={disabled}
      aria-label={label ?? zone.id}
      onClick={() => addBet(zone)}
      onMouseEnter={() => onHoverChange(zone)}
      onMouseLeave={() => onHoverChange(null)}
    >
      {zone.selection.type === 'redBlack' ? (
        <DiamondIcon color={zone.selection.color} />
      ) : (
        label && <span className="bet-zone-label">{label}</span>
      )}
      {entry && (
        <span className="bet-zone-chip" aria-hidden="true">
          <span className="bet-zone-chip-amount">{formatMoney(entry.stake)}</span>
        </span>
      )}
    </button>
  )
}
