import { getPocketAngleDegForGeometry, getPocketPositionForGeometry } from '../../utils/wheelPositions'
import type { PocketGeometry } from '../../utils/wheelPositions'
import { WHEEL_GEOMETRY } from '../../layout/wheelGeometry.constants'
import { getEffectiveWheelRenderMode } from '../../data/wheelRenderMode'
import { NUMBER_INDICATOR_STYLES } from './numberIndicatorStyles'
import type { NumberIndicatorType } from '../../types/numberIndicator'
import type { WheelPocket, WheelType } from '../../types/wheel'
import './HotColdNumberChip.css'

const CHIP_STACK_COUNT = 4

// --- Modo imagen (canvas 2560x1440, WHEEL_GEOMETRY) -- sin cambios respecto de siempre. ---
const CHIP_WIDTH = 46
const CHIP_HEIGHT = 26
const CHIP_CORNER_RADIUS = 8
// Mueve el conjunto entero (las 3 fichas juntas) a lo largo del mismo eje radial en el que
// están apiladas -- valores más grandes lo alejan del centro de la rueda, más chicos (o
// negativos) lo acercan. Ajustar a mano.
const CHIP_RADIUS_OFFSET = 175
// Separación vertical entre las fichas apiladas -- ajustar a mano.
const CHIP_STACK_SPACING = 6

// --- Modo video (canvas 1920x1080, WHEEL_VIDEO_GEOMETRY) -- TODOS los valores de acá son
// independientes de los de arriba, no se heredan ni se reescalan automáticamente: el canvas de
// video es más chico que el de imagen, así que las mismas unidades absolutas se ven
// proporcionalmente más grandes ahí (por eso las fichas se sentían "grandes" en video con los
// valores de imagen puestos directo). Ajustar cada uno a mano viendo el video en vivo (server de
// dev con HMR) hasta que se vea bien -- no hace falta tocar nada de arriba (modo imagen) al
// ajustar estos.
const CHIP_VIDEO_WIDTH = 35
const CHIP_VIDEO_HEIGHT = 20
const CHIP_VIDEO_CORNER_RADIUS = 6
const CHIP_VIDEO_RADIUS_OFFSET = 120
const CHIP_VIDEO_STACK_SPACING = 5
// Corrimiento en X (píxeles del canvas de video, aplicado directo al translate() del <g> que
// contiene las 4 fichas) SOLO en modo video -- mismo motivo que
// CELL_HIGHLIGHT_VIDEO_CENTER_X_OFFSET en NumberCellHighlight.tsx: geometry.center se midió por
// ajuste de círculo sobre el borde exterior de la rueda en el video, así que la posición calculada
// no calza 100% exacto con el número impreso. Positivo mueve a la derecha, negativo a la
// izquierda. En modo imagen no se aplica.
const CHIP_VIDEO_X_OFFSET = 0

function buildStackOffsets(height: number, spacing: number): number[] {
  return Array.from({ length: CHIP_STACK_COUNT }, (_, i) => (i - (CHIP_STACK_COUNT - 1) / 2) * (height + spacing))
}

const CHIP_STACK_OFFSETS = buildStackOffsets(CHIP_HEIGHT, CHIP_STACK_SPACING)
const CHIP_VIDEO_STACK_OFFSETS = buildStackOffsets(CHIP_VIDEO_HEIGHT, CHIP_VIDEO_STACK_SPACING)

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

  const isVideoMode = getEffectiveWheelRenderMode(wheelType) === 'video'
  const width = isVideoMode ? CHIP_VIDEO_WIDTH : CHIP_WIDTH
  const height = isVideoMode ? CHIP_VIDEO_HEIGHT : CHIP_HEIGHT
  const cornerRadius = isVideoMode ? CHIP_VIDEO_CORNER_RADIUS : CHIP_CORNER_RADIUS
  const radiusOffset = isVideoMode ? CHIP_VIDEO_RADIUS_OFFSET : CHIP_RADIUS_OFFSET
  const stackOffsets = isVideoMode ? CHIP_VIDEO_STACK_OFFSETS : CHIP_STACK_OFFSETS

  const { x, y } = getPocketPositionForGeometry(pocket, wheelType, geometry, radiusOffset)
  // Corrimiento en X aplicado directo al translate() del <g> -- solo en modo video, ver
  // CHIP_VIDEO_X_OFFSET.
  const translateX = isVideoMode ? x + CHIP_VIDEO_X_OFFSET : x
  const angleDeg = getPocketAngleDegForGeometry(pocket, wheelType, geometry) 
  const style = NUMBER_INDICATOR_STYLES[type]

  return (
    <g
      transform={`translate(${translateX}, ${y}) rotate(${angleDeg})`}
      data-number={pocket}
      data-indicator-type={type}
    >
      {stackOffsets.map((offsetY, i) => (
        <rect
          key={i}
          className="hot-cold-number-chip-rect"
          x={-width / 2}
          y={offsetY - height / 2}
          width={width}
          height={height}
          rx={cornerRadius}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={2}
        />
      ))}
    </g>
  )
}
