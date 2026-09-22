import type { BetZone } from '../../utils/rouletteBetZones'

// Prende/apaga los contornos de hit-area + etiqueta betType/target sin sacar el componente del
// árbol -- cambiar acá y guardar alcanza (hot reload), mismo criterio que
// LobbyWheelDebugOverlay.tsx (SHOW_DEBUG_POCKETS). Solo tiene efecto en dev (ver
// import.meta.env.DEV más abajo) -- en build de producción esto no se renderiza nunca.
const SHOW_BET_HIT_AREAS = false

export function HitAreaDebugOverlay({ zones }: { zones: BetZone[] }) {
  if (!import.meta.env.DEV || !SHOW_BET_HIT_AREAS) return null

  return (
    <div className="betting-hitarea-debug" aria-hidden="true">
      {zones.map((zone) => (
        <div
          key={zone.id}
          className="betting-hitarea-debug-box"
          style={{
            gridColumn: `${zone.gridArea.colStart} / ${zone.gridArea.colEnd}`,
            gridRow: `${zone.gridArea.rowStart} / ${zone.gridArea.rowEnd}`,
          }}
          title={zone.id}
        >
          <span>{zone.id}</span>
        </div>
      ))}
    </div>
  )
}
