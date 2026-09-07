import { ACTIVE_WHEEL_TYPE } from '../../data/wheelOrder'
import { getEffectiveWheelRenderMode } from '../../data/wheelRenderMode'
import { WHEEL_CANVAS_HEIGHT, WHEEL_CANVAS_WIDTH } from '../../layout/wheelGeometry.constants'
import { WHEEL_VIDEO_GEOMETRY } from '../../layout/wheelVideoGeometry.constants'
import { WheelRotorGroup } from '../wheel/WheelRotorGroup'
import { ColumnDiamondIndicator } from './ColumnDiamondIndicator'
import type { ColumnDiamondIndicatorPhase } from './ColumnDiamondIndicator'
import type { ColumnGroup } from '../../types/numberIndicator'
import type { WheelType } from '../../types/wheel'
import './ColumnDiamondIndicatorLayer.css'

export interface ColumnDiamondIndicatorEntry {
  pocket: number
  group: ColumnGroup
  phase: ColumnDiamondIndicatorPhase
  delayMs?: number
}

interface ColumnDiamondIndicatorLayerProps {
  entries: ColumnDiamondIndicatorEntry[]
  wheelType?: WheelType
}

// Renderiza el diamante de cada entry (ver useDozenColumnHighlightEntries para la lógica de fase
// 2 -- qué columna está activa y el acordeón de entrada/salida), girando en sincronía con la
// fuente visual activa -- CSS-phase-sync en modo imagen, video.currentTime en modo video (ver
// components/wheel/WheelRotorGroup.tsx y data/wheelRenderMode.ts).
export function ColumnDiamondIndicatorLayer({ entries, wheelType = ACTIVE_WHEEL_TYPE }: ColumnDiamondIndicatorLayerProps) {
  const mode = getEffectiveWheelRenderMode(wheelType)
  const videoGeometry = WHEEL_VIDEO_GEOMETRY[wheelType]
  const canvasWidth = mode === 'video' && videoGeometry ? videoGeometry.canvasWidth : WHEEL_CANVAS_WIDTH
  const canvasHeight = mode === 'video' && videoGeometry ? videoGeometry.canvasHeight : WHEEL_CANVAS_HEIGHT

  return (
    <svg
      className="column-diamond-indicator-layer"
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <WheelRotorGroup wheelType={wheelType} className="column-diamond-indicator-rotor-group" videoMode="rigid">
        {(geometry) =>
          entries.map(({ pocket, group, phase, delayMs }) => (
            <ColumnDiamondIndicator
              key={`${group}-${pocket}`}
              pocket={pocket}
              wheelType={wheelType}
              group={group}
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
