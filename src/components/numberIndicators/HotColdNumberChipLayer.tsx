import { ACTIVE_WHEEL_TYPE } from '../../data/wheelOrder'
import { getEffectiveWheelRenderMode } from '../../data/wheelRenderMode'
import { WHEEL_CANVAS_HEIGHT, WHEEL_CANVAS_WIDTH } from '../../layout/wheelGeometry.constants'
import { WHEEL_VIDEO_GEOMETRY } from '../../layout/wheelVideoGeometry.constants'
import { WheelRotorGroup } from '../wheel/WheelRotorGroup'
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
// sincronía con la fuente visual activa -- CSS-phase-sync en modo imagen, video.currentTime en
// modo video (ver components/wheel/WheelRotorGroup.tsx y data/wheelRenderMode.ts).
export function HotColdNumberChipLayer({ numbersByType, wheelType = ACTIVE_WHEEL_TYPE }: HotColdNumberChipLayerProps) {
  const mode = getEffectiveWheelRenderMode(wheelType)
  const videoGeometry = WHEEL_VIDEO_GEOMETRY[wheelType]
  const canvasWidth = mode === 'video' && videoGeometry ? videoGeometry.canvasWidth : WHEEL_CANVAS_WIDTH
  const canvasHeight = mode === 'video' && videoGeometry ? videoGeometry.canvasHeight : WHEEL_CANVAS_HEIGHT

  const entries = (Object.keys(numbersByType) as NumberIndicatorType[]).flatMap((type) =>
    (numbersByType[type] ?? []).map((pocket) => ({ pocket, type })),
  )

  return (
    <svg
      className="hot-cold-number-chip-layer"
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <WheelRotorGroup wheelType={wheelType} className="hot-cold-number-chip-rotor-group">
        {(geometry) =>
          entries.map(({ pocket, type }) => (
            <HotColdNumberChip key={`${type}-${pocket}`} pocket={pocket} wheelType={wheelType} type={type} active geometry={geometry} />
          ))
        }
      </WheelRotorGroup>
    </svg>
  )
}
