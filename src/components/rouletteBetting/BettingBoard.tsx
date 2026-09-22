import { useMemo, useState } from 'react'
import { ACTIVE_WHEEL_TYPE } from '../../data/wheelOrder'
import { buildRouletteBetZones, BETTING_BOARD_GRID, type BetZone } from '../../utils/rouletteBetZones'
import type { WheelPocket } from '../../types/wheel'
import { useBetSlipStore } from '../../store/useBetSlipStore'
import { BetZoneButton } from './BetZoneButton'
import { HitAreaDebugOverlay } from './HitAreaDebugOverlay'
import './bettingBoard.css'

interface BettingBoardProps {
  disabled: boolean
}

// Único lugar que arma el grid visual -- recorre buildRouletteBetZones() (fuente única de verdad
// de geometría, ver utils/rouletteBetZones.ts) y renderiza un BetZoneButton por zona. Ninguna
// posición está hardcodeada acá: si el layout de la mesa cambiara, se toca un solo archivo.
export function BettingBoard({ disabled }: BettingBoardProps) {
  const zones = useMemo(() => buildRouletteBetZones(ACTIVE_WHEEL_TYPE), [])
  const entries = useBetSlipStore((state) => state.entries)
  const [hoveredZone, setHoveredZone] = useState<BetZone | null>(null)

  const entriesByZoneId = useMemo(() => {
    const map = new Map<string, (typeof entries)[number]>()
    for (const entry of entries) map.set(entry.zoneId, entry)
    return map
  }, [entries])

  // Al pasar el mouse por cualquier apuesta compuesta -- Split/Trio/Street/Corner/Six Line, pero
  // también Column/Dozen/Red-Black/Odd-Even/High-Low -- lo que debe iluminarse con fuerza son los
  // NÚMEROS que esa apuesta cubre (no un rectángulo genérico), así el jugador ve exactamente
  // "estos son los números que entran si hago click acá", incluyendo 0/00 donde aplique (ver
  // Split/Trio de la zona cero en rouletteBetZones.ts). Se resuelve levantando el estado de hover
  // hasta acá (el único lugar que conoce todas las zonas a la vez) en vez de CSS puro: no hay
  // forma mantenible de resaltar celdas hermanas no adyacentes solo con :hover/:has sin
  // hardcodear una regla por número.
  const crossHighlightedPockets = useMemo(() => {
    if (!hoveredZone || hoveredZone.selection.type === 'straightUp') return null
    return new Set<WheelPocket>(hoveredZone.selection.pockets)
  }, [hoveredZone])

  return (
    <div className="betting-board" data-disabled={disabled}>
      <div
        className="betting-board-grid"
        style={{
          gridTemplateColumns: `repeat(${BETTING_BOARD_GRID.totalColumns}, 1fr)`,
          gridTemplateRows: `repeat(${BETTING_BOARD_GRID.totalRows}, 1fr)`,
          // Deriva del mismo totalColumns/totalRows que arma el grid -- así cada unidad de grid
          // (columna y fila) queda cuadrada en px sea cual sea UNIT/ROW_HEIGHT en
          // rouletteBetZones.ts. Un valor fijo acá se desincroniza apenas se retoca esa geometría
          // (pasó, ver historial) y deforma silenciosamente todas las celdas.
          aspectRatio: `${BETTING_BOARD_GRID.totalColumns} / ${BETTING_BOARD_GRID.totalRows}`,
        }}
      >
        {zones.map((zone) => (
          <BetZoneButton
            key={zone.id}
            zone={zone}
            entry={entriesByZoneId.get(zone.id)}
            disabled={disabled}
            onHoverChange={setHoveredZone}
            crossHighlighted={
              zone.selection.type === 'straightUp' && (crossHighlightedPockets?.has(zone.selection.pockets[0]) ?? false)
            }
          />
        ))}
        <HitAreaDebugOverlay zones={zones} />
      </div>
    </div>
  )
}
