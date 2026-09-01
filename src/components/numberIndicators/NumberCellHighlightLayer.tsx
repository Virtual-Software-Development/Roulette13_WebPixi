import { ACTIVE_WHEEL_TYPE } from '../../data/wheelOrder'
import { getEffectiveWheelRenderMode } from '../../data/wheelRenderMode'
import { WHEEL_CANVAS_HEIGHT, WHEEL_CANVAS_WIDTH } from '../../layout/wheelGeometry.constants'
import { WHEEL_VIDEO_GEOMETRY } from '../../layout/wheelVideoGeometry.constants'
import { WheelRotorGroup } from '../wheel/WheelRotorGroup'
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
// con la fuente visual activa -- CSS-phase-sync en modo imagen, video.currentTime en modo video
// (ver components/wheel/WheelRotorGroup.tsx y data/wheelRenderMode.ts).
export function NumberCellHighlightLayer({ entries, wheelType = ACTIVE_WHEEL_TYPE }: NumberCellHighlightLayerProps) {
  const mode = getEffectiveWheelRenderMode(wheelType)
  const videoGeometry = WHEEL_VIDEO_GEOMETRY[wheelType]
  const canvasWidth = mode === 'video' && videoGeometry ? videoGeometry.canvasWidth : WHEEL_CANVAS_WIDTH
  const canvasHeight = mode === 'video' && videoGeometry ? videoGeometry.canvasHeight : WHEEL_CANVAS_HEIGHT

  return (
    <svg
      className="number-cell-highlight-layer"
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <WheelRotorGroup wheelType={wheelType} className="number-cell-highlight-rotor-group">
        {(geometry) =>
          entries.map(({ pocket, phase, delayMs }) => (
            <NumberCellHighlight
              key={pocket}
              pocket={pocket}
              wheelType={wheelType}
              phase={phase}
              delayMs={delayMs}
              geometry={geometry}
            />
          ))
        }
      </WheelRotorGroup>
    </svg>
  )
}
