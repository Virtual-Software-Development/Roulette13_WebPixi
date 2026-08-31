import { useRef } from 'react'
import { ACTIVE_WHEEL_TYPE } from '../../data/wheelOrder'
import { WHEEL_CANVAS_HEIGHT, WHEEL_CANVAS_WIDTH, WHEEL_GEOMETRY, WHEEL_SPIN_DURATION_SEC } from '../../layout/wheelGeometry.constants'
import { useWheelRotationSync } from '../../hooks/useWheelRotationSync'
import { HotColdNumberChip } from './HotColdNumberChip'
import type { NumberIndicatorType } from '../../types/numberIndicator'
import type { WheelPocket, WheelType } from '../../types/wheel'
import './HotColdNumberChipLayer.css'

interface HotColdNumberChipLayerProps {
  // Un tipo nuevo (p. ej. 'repeated') se agrega como una clave más, sin tocar este componente.
  numbersByType: Partial<Record<NumberIndicatorType, WheelPocket[]>>
  wheelType?: WheelType
}

// Renderiza únicamente las fichas de los números presentes en numbersByType, girando en
// sincronía con .lobby-wheel-rotor (misma animación CSS compartida, ver LobbyWheelDebugOverlay).
export function HotColdNumberChipLayer({ numbersByType, wheelType = ACTIVE_WHEEL_TYPE }: HotColdNumberChipLayerProps) {
  const { center } = WHEEL_GEOMETRY[wheelType]
  const rotorGroupRef = useRef<SVGGElement>(null)
  useWheelRotationSync(rotorGroupRef, WHEEL_SPIN_DURATION_SEC)

  const entries = (Object.keys(numbersByType) as NumberIndicatorType[]).flatMap((type) =>
    (numbersByType[type] ?? []).map((pocket) => ({ pocket, type })),
  )

  return (
    <svg
      className="hot-cold-number-chip-layer"
      viewBox={`0 0 ${WHEEL_CANVAS_WIDTH} ${WHEEL_CANVAS_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <g
        ref={rotorGroupRef}
        className="hot-cold-number-chip-rotor-group"
        style={{ transformOrigin: `${center.x}px ${center.y}px`, animationDuration: `${WHEEL_SPIN_DURATION_SEC}s` }}
      >
        {entries.map(({ pocket, type }) => (
          <HotColdNumberChip key={`${type}-${pocket}`} pocket={pocket} wheelType={wheelType} type={type} active />
        ))}
      </g>
    </svg>
  )
}
