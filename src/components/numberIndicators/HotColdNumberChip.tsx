import { getPocketAngleDegForGeometry, getPocketPositionForGeometry } from '../../utils/wheelPositions'
import type { PocketGeometry } from '../../utils/wheelPositions'
import { WHEEL_GEOMETRY } from '../../layout/wheelGeometry.constants'
import { NUMBER_INDICATOR_STYLES } from './numberIndicatorStyles'
import type { NumberIndicatorType } from '../../types/numberIndicator'
import type { WheelPocket, WheelType } from '../../types/wheel'
import './HotColdNumberChip.css'

const CHIP_WIDTH = 46
const CHIP_HEIGHT = 26
const CHIP_CORNER_RADIUS = 8
// Mueve el conjunto entero (las 3 fichas juntas) a lo largo del mismo eje radial en el que
// están apiladas -- valores más grandes lo alejan del centro de la rueda, más chicos (o
// negativos) lo acercan. Ajustar a mano.
const CHIP_RADIUS_OFFSET = 100
const CHIP_STACK_COUNT = 4
// Separación vertical entre las fichas apiladas -- ajustar a mano.
const CHIP_STACK_SPACING = 6
const CHIP_STACK_OFFSETS = Array.from(
  { length: CHIP_STACK_COUNT },
  (_, i) => (i - (CHIP_STACK_COUNT - 1) / 2) * (CHIP_HEIGHT + CHIP_STACK_SPACING),
)

interface HotColdNumberChipProps {
  pocket: WheelPocket
  wheelType: WheelType
  type: NumberIndicatorType
  active: boolean
  // Geometría a usar para ubicar la casilla -- por defecto WHEEL_GEOMETRY[wheelType] (modo
  // imagen, mismo comportamiento de siempre). Pasar WHEEL_VIDEO_GEOMETRY[wheelType] (ver
  // layout/wheelVideoGeometry.constants.ts) para dibujar sobre el modo video en vez de la imagen.
  geometry?: PocketGeometry
}

// Ficha pulsante anclada a la posición de una casilla del rotor, para marcar números
// calientes/fríos (hot/cold). Cuando active=false no renderiza nada -- ni color, ni borde, ni
// espacio: el número simplemente no tiene ficha.
export function HotColdNumberChip({ pocket, wheelType, type, active, geometry = WHEEL_GEOMETRY[wheelType] }: HotColdNumberChipProps) {
  if (!active) {
    return null
  }

  const { x, y } = getPocketPositionForGeometry(pocket, wheelType, geometry, CHIP_RADIUS_OFFSET)
  const angleDeg = getPocketAngleDegForGeometry(pocket, wheelType, geometry)
  const style = NUMBER_INDICATOR_STYLES[type]

  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${angleDeg})`}
      data-number={pocket}
      data-indicator-type={type}
    >
      {CHIP_STACK_OFFSETS.map((offsetY, i) => (
        <rect
          key={i}
          className="hot-cold-number-chip-rect"
          x={-CHIP_WIDTH / 2}
          y={offsetY - CHIP_HEIGHT / 2}
          width={CHIP_WIDTH}
          height={CHIP_HEIGHT}
          rx={CHIP_CORNER_RADIUS}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={2}
        />
      ))}
    </g>
  )
}
