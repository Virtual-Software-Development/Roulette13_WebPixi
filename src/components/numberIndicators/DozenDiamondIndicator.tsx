import { getPocketAngleDegForGeometry, getPocketPositionForGeometry } from '../../utils/wheelPositions'
import type { PocketGeometry } from '../../utils/wheelPositions'
import { WHEEL_GEOMETRY } from '../../layout/wheelGeometry.constants'
import { DOZEN_DIAMOND_INDICATOR_STYLES } from './dozenDiamondIndicatorStyles'
import type { DozenGroup } from '../../types/numberIndicator'
import type { WheelPocket, WheelType } from '../../types/wheel'
import './DozenDiamondIndicator.css'

// Ancho del diamante -- ajustar a mano (ver CHIP_WIDTH/CHIP_HEIGHT en HotColdNumberChip.tsx,
// mismo criterio: son constantes de archivo, no hay que tocar la lógica para cambiarlas).
export const DOZEN_DIAMOND_DEFAULT_WIDTH = 25
// Alto del diamante.
export const DOZEN_DIAMOND_DEFAULT_HEIGHT = 35

// Separa el diamante del anillo de números impresos -- ajustar a mano (ver CHIP_RADIUS_OFFSET
// en HotColdNumberChip.tsx, mismo criterio). Valores más grandes lo alejan del centro de la
// rueda, más chicos (o negativos) lo acercan.
const DOZEN_DIAMOND_RADIUS_OFFSET = 95
const DOZEN_DIAMOND_STROKE_WIDTH = 2
const DOZEN_DIAMOND_GLOW_BLUR = 8
const DOZEN_DIAMOND_BLINK_STROKE_WIDTH = 1.5
// El diamante que hace blink es más grande que el principal (tipo halo) -- este factor se
// aplica sobre width/height. Ajustar a mano.
const DOZEN_DIAMOND_BLINK_SCALE = 1.5

interface DozenDiamondIndicatorProps {
  pocket: WheelPocket
  wheelType: WheelType
  group: DozenGroup
  active: boolean
  width?: number
  height?: number
  // Geometría a usar para ubicar la casilla -- por defecto WHEEL_GEOMETRY[wheelType] (modo
  // imagen, mismo comportamiento de siempre). Pasar WHEEL_VIDEO_GEOMETRY[wheelType] (ver
  // layout/wheelVideoGeometry.constants.ts) para dibujar sobre el modo video en vez de la imagen.
  geometry?: PocketGeometry
}

function buildDiamondPoints(width: number, height: number): string {
  const halfW = width / 2
  const halfH = height / 2
  return [`0,${-halfH}`, `${halfW},0`, `0,${halfH}`, `${-halfW},0`].join(' ')
}

// Anclado a la posición de una casilla del rotor (mismo patrón que HotColdNumberChip.tsx) --
// no calcula su propio grupo activo ni cicla solo, eso lo decide DozenDiamondIndicatorLayer.
// rotate(angleDeg) es lo que hace que se perciba el giro: sin esto, aunque el diamante sigue
// correctamente la posición de su casilla (el <g> rotor padre ya gira sincronizado con
// .lobby-wheel-rotor), un diamante es simétrico bajo giros de 90° y visualmente "no se nota"
// que está girando -- al rotarlo igual que HotColdNumberChip, el ojo detecta el giro igual
// que con las fichas de hot/cold.
export function DozenDiamondIndicator({
  pocket,
  wheelType,
  group,
  active,
  width = DOZEN_DIAMOND_DEFAULT_WIDTH,
  height = DOZEN_DIAMOND_DEFAULT_HEIGHT,
  geometry = WHEEL_GEOMETRY[wheelType],
}: DozenDiamondIndicatorProps) {
  if (!active) return null

  const { x, y } = getPocketPositionForGeometry(pocket, wheelType, geometry, DOZEN_DIAMOND_RADIUS_OFFSET)
  const angleDeg = getPocketAngleDegForGeometry(pocket, wheelType, geometry)
  const style = DOZEN_DIAMOND_INDICATOR_STYLES[group]
  const points = buildDiamondPoints(width, height)
  const blinkPoints = buildDiamondPoints(width * DOZEN_DIAMOND_BLINK_SCALE, height * DOZEN_DIAMOND_BLINK_SCALE)
  const glowId = `dozen-diamond-glow-${group}-${pocket}`

  return (
    <g transform={`translate(${x}, ${y}) rotate(${angleDeg})`} data-number={pocket} data-dozen-group={group}>
      <defs>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation={DOZEN_DIAMOND_GLOW_BLUR} floodColor={style.glow} floodOpacity="1" />
        </filter>
      </defs>
      {/* Diamante base: líneas con glow simétrico (feDropShadow) alrededor del trazo, que se
          lee como halo tanto hacia adentro como hacia afuera del diamante. */}
      <polygon
        className="dozen-diamond-indicator-base"
        points={points}
        fill="none"
        stroke={style.stroke}
        strokeWidth={DOZEN_DIAMOND_STROKE_WIDTH}
        filter={`url(#${glowId})`}
      />
      {/* Segundo diamante, más grande (tipo halo), superpuesto -- hace blink por CSS (ver
          .css), apareciendo y desapareciendo por fuera del diamante principal. */}
      <polygon
        className="dozen-diamond-indicator-blink-line"
        points={blinkPoints}
        fill="none"
        stroke={style.glow}
        strokeWidth={DOZEN_DIAMOND_BLINK_STROKE_WIDTH}
      />
    </g>
  )
}
