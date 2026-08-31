import { useRef } from 'react'
import { ACTIVE_WHEEL_TYPE } from '../../data/wheelOrder'
import { WHEEL_CANVAS_HEIGHT, WHEEL_CANVAS_WIDTH, WHEEL_GEOMETRY, WHEEL_SPIN_DURATION_SEC } from '../../layout/wheelGeometry.constants'
import { useWheelRotationSync } from '../../hooks/useWheelRotationSync'
import { NumberCellHighlight } from './NumberCellHighlight'
import type { NumberCellHighlightPhase } from './NumberCellHighlight'
import type { WheelPocket, WheelType } from '../../types/wheel'
import './NumberCellHighlightLayer.css'

export interface NumberCellHighlightEntry {
  pocket: WheelPocket
  phase: NumberCellHighlightPhase
  delayMs?: number
}

interface NumberCellHighlightLayerProps {
  entries: NumberCellHighlightEntry[]
  wheelType?: WheelType
}

// Renderer puro: dibuja exactamente los números presentes en entries, en la phase que le
// indiquen (ver useNumberCellHighlightCycle.ts para la lógica de tiempos), girando en sincronía
// con .lobby-wheel-rotor (misma animación CSS compartida, ver LobbyWheelDebugOverlay).
export function NumberCellHighlightLayer({ entries, wheelType = ACTIVE_WHEEL_TYPE }: NumberCellHighlightLayerProps) {
  const { center } = WHEEL_GEOMETRY[wheelType]
  const rotorGroupRef = useRef<SVGGElement>(null)
  useWheelRotationSync(rotorGroupRef, WHEEL_SPIN_DURATION_SEC)

  return (
    <svg
      className="number-cell-highlight-layer"
      viewBox={`0 0 ${WHEEL_CANVAS_WIDTH} ${WHEEL_CANVAS_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <g
        ref={rotorGroupRef}
        className="number-cell-highlight-rotor-group"
        style={{ transformOrigin: `${center.x}px ${center.y}px`, animationDuration: `${WHEEL_SPIN_DURATION_SEC}s` }}
      >
        {entries.map(({ pocket, phase, delayMs }) => (
          <NumberCellHighlight key={pocket} pocket={pocket} wheelType={wheelType} phase={phase} delayMs={delayMs} />
        ))}
      </g>
    </svg>
  )
}
