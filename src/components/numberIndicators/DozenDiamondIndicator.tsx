import { memo } from 'react'
import type { CSSProperties } from 'react'
import { getPocketAngleDegForGeometry, getPocketPositionForGeometry } from '../../utils/wheelPositions'
import type { PocketGeometry } from '../../utils/wheelPositions'
import { WHEEL_GEOMETRY } from '../../layout/wheelGeometry.constants'
import { getDiamondGlowSprite } from '../../utils/diamondGlowSprite'
import { pocketAngleChangedBeyondThreshold } from './pocketGeometryMemo'
import { DOZEN_DIAMOND_INDICATOR_STYLES } from './dozenDiamondIndicatorStyles'
import { DIAMOND_INDICATOR_ENTER_DURATION_MS, DIAMOND_INDICATOR_LEAVE_DURATION_MS } from './diamondIndicatorTiming'
import type { DozenGroup } from '../../types/numberIndicator'
import type { WheelPocket, WheelType } from '../../types/wheel'
import './DozenDiamondIndicator.css'

export type DozenDiamondIndicatorPhase = 'entering' | 'visible' | 'leaving'

// Ancho del diamante -- ajustar a mano (ver CHIP_WIDTH/CHIP_HEIGHT en HotColdNumberChip.tsx,
// mismo criterio: son constantes de archivo, no hay que tocar la lógica para cambiarlas).
export const DOZEN_DIAMOND_DEFAULT_WIDTH = 25
// Alto del diamante.
export const DOZEN_DIAMOND_DEFAULT_HEIGHT = 35

// Separa el diamante del anillo de números impresos -- ajustar a mano (ver CHIP_RADIUS_OFFSET
// en HotColdNumberChip.tsx, mismo criterio). Valores más grandes lo alejan del centro de la
// rueda, más chicos (o negativos) lo acercan.
const DOZEN_DIAMOND_RADIUS_OFFSET = 175
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
  // 'entering'/'leaving' juegan un pop de fade+scale (ver DozenDiamondIndicator.css); 'visible' no
  // anima nada. A diferencia del `active: boolean` que tenía antes, este componente ya NO decide
  // cuándo desmontarse solo -- eso lo controla DozenDiamondIndicatorLayer vía `entries` (ver
  // useDozenColumnHighlightEntries), que lo sigue incluyendo mientras dura su salida.
  phase: DozenDiamondIndicatorPhase
  // Cuánto tarda en arrancar el pop de este diamante respecto de los demás del mismo grupo --
  // efecto acordeón (ver useDozenColumnHighlightEntries). Ignorado si phase es 'visible'.
  delayMs?: number
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
function DozenDiamondIndicatorComponent({
  pocket,
  wheelType,
  group,
  phase,
  delayMs = 0,
  width = DOZEN_DIAMOND_DEFAULT_WIDTH,
  height = DOZEN_DIAMOND_DEFAULT_HEIGHT,
  geometry = WHEEL_GEOMETRY[wheelType],
}: DozenDiamondIndicatorProps) {
  const { x, y } = getPocketPositionForGeometry(pocket, wheelType, geometry, DOZEN_DIAMOND_RADIUS_OFFSET)
  const angleDeg = getPocketAngleDegForGeometry(pocket, wheelType, geometry)
  const style = DOZEN_DIAMOND_INDICATOR_STYLES[group]
  const blinkPoints = buildDiamondPoints(width * DOZEN_DIAMOND_BLINK_SCALE, height * DOZEN_DIAMOND_BLINK_SCALE)
  // Sprite prerenderizado compartido por (tamaño, color) -- mismo criterio que
  // ColumnDiamondIndicator.tsx (ver comentario largo ahí y en diamondGlowSprite.ts).
  const sprite = getDiamondGlowSprite({
    width,
    height,
    strokeColor: style.stroke,
    glowColor: style.glow,
    strokeWidth: DOZEN_DIAMOND_STROKE_WIDTH,
    glowBlur: DOZEN_DIAMOND_GLOW_BLUR,
  })

  // Wrapper interno para el pop de entrada/salida -- un transform CSS acá (scale) no choca con el
  // transform de posición/rotación del <g> de afuera (attribute SVG), mismo criterio que separa
  // maskRect de su casilla en NumberCellHighlight.tsx.
  const bodyStyle: CSSProperties | undefined =
    phase === 'visible'
      ? undefined
      : {
          animationDuration: `${phase === 'entering' ? DIAMOND_INDICATOR_ENTER_DURATION_MS : DIAMOND_INDICATOR_LEAVE_DURATION_MS}ms`,
          animationDelay: `${delayMs}ms`,
        }

  return (
    <g transform={`translate(${x}, ${y}) rotate(${angleDeg})`} data-number={pocket} data-dozen-group={group}>
      <g className={`dozen-diamond-indicator-body dozen-diamond-indicator-body--${phase}`} style={bodyStyle}>
        {/* Diamante base: sprite prerenderizado (trazo + glow ya horneados) en vez de
            polygon+filter por instancia. */}
        <image
          className="dozen-diamond-indicator-base"
          href={sprite.url}
          x={sprite.offsetX}
          y={sprite.offsetY}
          width={sprite.spriteWidth}
          height={sprite.spriteHeight}
        />
        {/* Segundo diamante, más grande (tipo halo), superpuesto -- hace blink por CSS (ver
            .css), apareciendo y desapareciendo por fuera del diamante principal. Sigue siendo un
            polygon liviano: no lleva filter propio. */}
        <polygon
          className="dozen-diamond-indicator-blink-line"
          points={blinkPoints}
          fill="none"
          stroke={style.glow}
          strokeWidth={DOZEN_DIAMOND_BLINK_STROKE_WIDTH}
        />
      </g>
    </g>
  )
}

// Mismo criterio que ColumnDiamondIndicator.tsx (ver comentario largo ahí): sin este memo,
// ColumnDiamondIndicatorLayer/DozenDiamondIndicatorLayer le pasan una `geometry` nueva a cada
// diamante en cada frame real de video, forzando reconciliación aunque el ángulo de esta casilla
// puntual apenas se haya movido.
function dozenDiamondPropsAreEqual(prev: DozenDiamondIndicatorProps, next: DozenDiamondIndicatorProps): boolean {
  if (
    prev.pocket !== next.pocket ||
    prev.wheelType !== next.wheelType ||
    prev.group !== next.group ||
    prev.phase !== next.phase ||
    prev.delayMs !== next.delayMs ||
    prev.width !== next.width ||
    prev.height !== next.height
  ) {
    return false
  }

  const prevGeometry = prev.geometry ?? WHEEL_GEOMETRY[prev.wheelType]
  const nextGeometry = next.geometry ?? WHEEL_GEOMETRY[next.wheelType]
  return !pocketAngleChangedBeyondThreshold(next.pocket, next.wheelType, prevGeometry, nextGeometry)
}

export const DozenDiamondIndicator = memo(DozenDiamondIndicatorComponent, dozenDiamondPropsAreEqual)
