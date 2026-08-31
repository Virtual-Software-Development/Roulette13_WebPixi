import { useRef } from 'react'
import { ACTIVE_WHEEL_TYPE } from '../../data/wheelOrder'
import { WHEEL_CANVAS_HEIGHT, WHEEL_CANVAS_WIDTH, WHEEL_GEOMETRY, WHEEL_SPIN_DURATION_SEC } from '../../layout/wheelGeometry.constants'
import { useWheelRotationSync } from '../../hooks/useWheelRotationSync'
import { getColumnGroupPockets } from '../../utils/columnGroups'
import { ColumnDiamondIndicator } from './ColumnDiamondIndicator'
import type { ColumnGroup } from '../../types/numberIndicator'
import type { WheelType } from '../../types/wheel'
import './ColumnDiamondIndicatorLayer.css'

interface ColumnDiamondIndicatorLayerProps {
  activeGroups: ColumnGroup[]
  wheelType?: WheelType
}

// Renderiza el diamante de cada número perteneciente a los grupos presentes en activeGroups,
// girando en sincronía con .lobby-wheel-rotor (mismo patrón que DozenDiamondIndicatorLayer.tsx
// / HotColdNumberChipLayer.tsx).
export function ColumnDiamondIndicatorLayer({ activeGroups, wheelType = ACTIVE_WHEEL_TYPE }: ColumnDiamondIndicatorLayerProps) {
  const { center } = WHEEL_GEOMETRY[wheelType]
  const rotorGroupRef = useRef<SVGGElement>(null)
  useWheelRotationSync(rotorGroupRef, WHEEL_SPIN_DURATION_SEC)

  const entries = activeGroups.flatMap((group) => getColumnGroupPockets(group).map((pocket) => ({ pocket, group })))

  return (
    <svg
      className="column-diamond-indicator-layer"
      viewBox={`0 0 ${WHEEL_CANVAS_WIDTH} ${WHEEL_CANVAS_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <g
        ref={rotorGroupRef}
        className="column-diamond-indicator-rotor-group"
        style={{ transformOrigin: `${center.x}px ${center.y}px`, animationDuration: `${WHEEL_SPIN_DURATION_SEC}s` }}
      >
        {entries.map(({ pocket, group }) => (
          <ColumnDiamondIndicator key={`${group}-${pocket}`} pocket={pocket} wheelType={wheelType} group={group} active />
        ))}
      </g>
    </svg>
  )
}
