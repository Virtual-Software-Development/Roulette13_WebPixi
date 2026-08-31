import { useRef } from 'react'
import { ACTIVE_WHEEL_TYPE } from '../../data/wheelOrder'
import { WHEEL_CANVAS_HEIGHT, WHEEL_CANVAS_WIDTH, WHEEL_GEOMETRY, WHEEL_SPIN_DURATION_SEC } from '../../layout/wheelGeometry.constants'
import { useWheelRotationSync } from '../../hooks/useWheelRotationSync'
import { getDozenGroupPockets } from '../../utils/dozenGroups'
import { DozenDiamondIndicator } from './DozenDiamondIndicator'
import type { DozenGroup } from '../../types/numberIndicator'
import type { WheelType } from '../../types/wheel'
import './DozenDiamondIndicatorLayer.css'

interface DozenDiamondIndicatorLayerProps {
  activeGroups: DozenGroup[]
  wheelType?: WheelType
}

// Renderiza el diamante de cada número perteneciente a los grupos presentes en activeGroups,
// girando en sincronía con .lobby-wheel-rotor (mismo patrón que HotColdNumberChipLayer.tsx).
export function DozenDiamondIndicatorLayer({ activeGroups, wheelType = ACTIVE_WHEEL_TYPE }: DozenDiamondIndicatorLayerProps) {
  const { center } = WHEEL_GEOMETRY[wheelType]
  const rotorGroupRef = useRef<SVGGElement>(null)
  useWheelRotationSync(rotorGroupRef, WHEEL_SPIN_DURATION_SEC)

  const entries = activeGroups.flatMap((group) => getDozenGroupPockets(group).map((pocket) => ({ pocket, group })))

  return (
    <svg
      className="dozen-diamond-indicator-layer"
      viewBox={`0 0 ${WHEEL_CANVAS_WIDTH} ${WHEEL_CANVAS_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <g
        ref={rotorGroupRef}
        className="dozen-diamond-indicator-rotor-group"
        style={{ transformOrigin: `${center.x}px ${center.y}px`, animationDuration: `${WHEEL_SPIN_DURATION_SEC}s` }}
      >
        {entries.map(({ pocket, group }) => (
          <DozenDiamondIndicator key={`${group}-${pocket}`} pocket={pocket} wheelType={wheelType} group={group} active />
        ))}
      </g>
    </svg>
  )
}
