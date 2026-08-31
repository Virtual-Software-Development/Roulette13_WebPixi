import { getPocketAngleDeg, getPocketPosition } from '../../utils/wheelPositions'
import { COLUMN_DIAMOND_INDICATOR_STYLES } from './columnDiamondIndicatorStyles'
import type { ColumnGroup } from '../../types/numberIndicator'
import type { WheelPocket, WheelType } from '../../types/wheel'
import './ColumnDiamondIndicator.css'

// Ancho del diamante -- ajustar a mano (ver CHIP_WIDTH/CHIP_HEIGHT en HotColdNumberChip.tsx,
// mismo criterio: son constantes de archivo, no hay que tocar la lógica para cambiarlas).
export const COLUMN_DIAMOND_DEFAULT_WIDTH = 25
// Alto del diamante -- también entra en el cálculo de la separación entre los 3 apilados (ver
// COLUMN_DIAMOND_STACK_SPACING).
export const COLUMN_DIAMOND_DEFAULT_HEIGHT = 30

// Separa el conjunto del anillo de números impresos -- ajustar a mano (ver CHIP_RADIUS_OFFSET
// en HotColdNumberChip.tsx, mismo criterio). Valores más grandes lo alejan del centro de la
// rueda, más chicos (o negativos) lo acercan.
const COLUMN_DIAMOND_RADIUS_OFFSET = 115
const COLUMN_DIAMOND_STROKE_WIDTH = 2
const COLUMN_DIAMOND_GLOW_BLUR = 8
const COLUMN_DIAMOND_BLINK_STROKE_WIDTH = 1.5

// Una columna se marca con 3 diamantes apilados (mismo criterio que CHIP_STACK_COUNT en
// HotColdNumberChip.tsx).
const COLUMN_DIAMOND_STACK_COUNT = 3
// Separación vertical entre los diamantes apilados -- ajustar a mano (ver CHIP_STACK_SPACING
// en HotColdNumberChip.tsx, mismo criterio).
const COLUMN_DIAMOND_STACK_SPACING = 6

interface ColumnDiamondIndicatorProps {
  pocket: WheelPocket
  wheelType: WheelType
  group: ColumnGroup
  active: boolean
  width?: number
  height?: number
}

function buildDiamondPoints(width: number, height: number): string {
  const halfW = width / 2
  const halfH = height / 2
  return [`0,${-halfH}`, `${halfW},0`, `0,${halfH}`, `${-halfW},0`].join(' ')
}

function buildStackOffsets(height: number): number[] {
  return Array.from(
    { length: COLUMN_DIAMOND_STACK_COUNT },
    (_, i) => (i - (COLUMN_DIAMOND_STACK_COUNT - 1) / 2) * (height + COLUMN_DIAMOND_STACK_SPACING),
  )
}

// Velocidad de la cadena de encendido/apagado -- ajustar a mano.
const COLUMN_DIAMOND_CHASE_DURATION_MS = 1200

// buildStackOffsets(i=0) da el offset más negativo -- por cómo se compone translate+rotate,
// eso cae del lado de afuera de la rueda (más lejos del centro); i=2 (offset más positivo) cae
// del lado de adentro (más cerca del centro, el más próximo al número). "Primero" es el de
// adentro (i=2): queda siempre encendido. "Segundo" (i=1) y "último" (i=0, el de afuera) se
// prenden/apagan en cadena por CSS (ver @keyframes column-diamond-indicator-chase-* en el
// .css): se enciende el segundo, luego el último; se apaga el último, luego el segundo -- loop.
const STACK_POSITION_CLASS_NAMES = ['column-diamond-indicator-stack-last', 'column-diamond-indicator-stack-second', 'column-diamond-indicator-stack-first']

// Anclado a la posición de una casilla del rotor (mismo patrón que HotColdNumberChip.tsx) --
// no calcula su propio grupo activo ni cicla solo, eso lo decide ColumnDiamondIndicatorLayer.
// rotate(angleDeg) es lo que hace que se perciba el giro: sin esto, aunque el conjunto sigue
// correctamente la posición de su casilla (el <g> rotor padre ya gira sincronizado con
// .lobby-wheel-rotor), un diamante es simétrico bajo giros de 90° y visualmente "no se nota"
// que está girando -- al rotarlo igual que HotColdNumberChip, el ojo detecta el giro igual
// que con las fichas de hot/cold.
export function ColumnDiamondIndicator({
  pocket,
  wheelType,
  group,
  active,
  width = COLUMN_DIAMOND_DEFAULT_WIDTH,
  height = COLUMN_DIAMOND_DEFAULT_HEIGHT,
}: ColumnDiamondIndicatorProps) {
  if (!active) return null

  const { x, y } = getPocketPosition(pocket, wheelType, COLUMN_DIAMOND_RADIUS_OFFSET)
  const angleDeg = getPocketAngleDeg(pocket, wheelType)
  const style = COLUMN_DIAMOND_INDICATOR_STYLES[group]
  const points = buildDiamondPoints(width, height)
  const stackOffsets = buildStackOffsets(height)

  return (
    <g transform={`translate(${x}, ${y}) rotate(${angleDeg})`} data-number={pocket} data-column-group={group}>
      {stackOffsets.map((offsetY, i) => {
        const glowId = `column-diamond-glow-${group}-${pocket}-${i}`
        return (
          <g
            key={i}
            className={STACK_POSITION_CLASS_NAMES[i]}
            transform={`translate(0, ${offsetY})`}
            style={{ animationDuration: `${COLUMN_DIAMOND_CHASE_DURATION_MS}ms` }}
          >
            <defs>
              <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation={COLUMN_DIAMOND_GLOW_BLUR} floodColor={style.glow} floodOpacity="1" />
              </filter>
            </defs>
            {/* Diamante base: líneas con glow simétrico (feDropShadow) alrededor del trazo, que
                se lee como halo tanto hacia adentro como hacia afuera del diamante. */}
            <polygon
              className="column-diamond-indicator-base"
              points={points}
              fill="none"
              stroke={style.stroke}
              strokeWidth={COLUMN_DIAMOND_STROKE_WIDTH}
              filter={`url(#${glowId})`}
            />
            {/* Segunda línea, misma forma, superpuesta -- hace blink por CSS (ver .css). */}
            <polygon
              className="column-diamond-indicator-blink-line"
              points={points}
              fill="none"
              stroke={style.glow}
              strokeWidth={COLUMN_DIAMOND_BLINK_STROKE_WIDTH}
            />
          </g>
        )
      })}
    </g>
  )
}
