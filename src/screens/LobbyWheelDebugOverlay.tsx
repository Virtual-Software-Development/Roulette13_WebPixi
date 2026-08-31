import { useRef } from 'react'
import { ACTIVE_WHEEL_TYPE, getWheelOrder } from '../data/wheelOrder'
import { WHEEL_CANVAS_HEIGHT, WHEEL_CANVAS_WIDTH, WHEEL_GEOMETRY, WHEEL_SPIN_DURATION_SEC } from '../layout/wheelGeometry.constants'
import { getPocketAngleDeg, getPocketPosition } from '../utils/wheelPositions'
import { useWheelRotationSync } from '../hooks/useWheelRotationSync'
import './lobbyWheelDebugOverlay.css'

// Referencia visual para calibrar WHEEL_GEOMETRY (wheelGeometry.constants.ts) contra los
// números reales impresos en el rotor de ACTIVE_WHEEL_TYPE. viewBox="0 0 2560 1440" reproduce
// el mismo letterboxing que object-fit:contain en las <img> de LobbyBackgroundLayer, así que
// las coordenadas del canvas del PNG valen tal cual, sin convertir a porcentajes del
// contenedor. El grupo de puntos gira con el mismo transform CSS que .lobby-wheel-rotor (misma
// duración, WHEEL_SPIN_DURATION_SEC) para seguir la rueda real en vez de recalcular posiciones
// cuadro a cuadro. Solo en dev.
export function LobbyWheelDebugOverlay() {
  const rotorGroupRef = useRef<SVGGElement>(null)
  useWheelRotationSync(rotorGroupRef, WHEEL_SPIN_DURATION_SEC)

  if (!import.meta.env.DEV) return null

  const order = getWheelOrder(ACTIVE_WHEEL_TYPE)
  const { center } = WHEEL_GEOMETRY[ACTIVE_WHEEL_TYPE]

  return (
    <svg
      className="lobby-wheel-debug-overlay"
      viewBox={`0 0 ${WHEEL_CANVAS_WIDTH} ${WHEEL_CANVAS_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <g
        ref={rotorGroupRef}
        className="lobby-wheel-debug-rotor-group"
        style={{ transformOrigin: `${center.x}px ${center.y}px`, animationDuration: `${WHEEL_SPIN_DURATION_SEC}s` }}
      >
        {order.map((pocket) => {
          const { x, y } = getPocketPosition(pocket, ACTIVE_WHEEL_TYPE)
          const angleDeg = getPocketAngleDeg(pocket, ACTIVE_WHEEL_TYPE)
          return (
            <g
              key={pocket}
              className="lobby-wheel-debug-pocket"
              transform={`translate(${x}, ${y}) rotate(${angleDeg})`}
            >
              <circle r={16} />
              <text dy="0.35em">{pocket}</text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
