import type { CSSProperties } from 'react'
import { describeCellFlarePath, getPocketAngleDegForGeometry, getPolarPoint } from '../../utils/wheelPositions'
import type { PocketGeometry } from '../../utils/wheelPositions'
import { getRouletteColor } from '../../utils/rouletteColors'
import { NUMBER_CELL_HIGHLIGHT_STYLES } from './numberCellHighlightStyles'
import { WHEEL_GEOMETRY } from '../../layout/wheelGeometry.constants'
import type { WheelPocket, WheelType } from '../../types/wheel'
import './NumberCellHighlight.css'

// Radio del borde de abajo (más cerca del centro de la rueda) y de arriba (más afuera) -- no
// hay dato medido contra el PNG real (a diferencia de WHEEL_GEOMETRY.radius), así que quedan
// acá como constantes a ajustar a mano. Mover cualquiera de las dos cambia el LARGO del
// rectángulo (la distancia entre el borde de abajo y el de arriba).
const CELL_HIGHLIGHT_BOTTOM_RADIUS = 260
const CELL_HIGHLIGHT_TOP_RADIUS = 480

// Cada una de las 4 esquinas del rectángulo se mueve de forma independiente con su propio
// valor: son grados de offset respecto al ángulo central de la casilla (getPocketAngleDeg),
// hacia el lado "start" (negativo) o "end" (positivo). No están atados al ancho real de la
// casilla ni se recortan contra ella -- moverlos como se necesite para dar el ancho deseado.
const CELL_HIGHLIGHT_BOTTOM_START_DEG = -4.5 // esquina inferior izquierda
const CELL_HIGHLIGHT_BOTTOM_END_DEG = 4.5 // esquina inferior derecha
const CELL_HIGHLIGHT_TOP_START_DEG = -6 // esquina superior izquierda
const CELL_HIGHLIGHT_TOP_END_DEG = 6 // esquina superior derecha

// Glow de las líneas laterales -- mismo color que se le envía a la casilla (style.glow), mismo
// criterio que el halo del countdown "next round" (ver COUNTDOWN_VALUE_STYLE_NORMAL en
// layout.constants.ts: dropShadow con blur, mismo color que el fill). Ajustar a mano.
const CELL_HIGHLIGHT_GLOW_BLUR = 50
const CELL_HIGHLIGHT_GLOW_STROKE_WIDTH = 3

// Cuánto se corren las líneas hacia ADENTRO del rectángulo (grados, restados del ángulo real de
// cada esquina) antes de dibujarlas -- las líneas viven recortadas al propio rectángulo
// (clipPath), así que si se dibujan justo sobre el borde real, ese mismo clip les corta la mitad
// del stroke y casi todo el halo hacia afuera antes de que se alcance a ver. Corriéndolas hacia
// adentro les queda margen real para que el blur se desvanezca en vez de cortarse en seco.
const CELL_HIGHLIGHT_GLOW_INSET_DEG = 1

// Duración de la animación de "barra de carga" que revela/oculta la casilla -- una sola fuente
// de verdad, reutilizada tanto acá (animationDuration del rect de máscara) como en
// useNumberCellHighlightCycle.ts (para saber cuándo agendar la siguiente fase del ciclo).
export const NUMBER_CELL_HIGHLIGHT_ENTER_DURATION_MS = 200
export const NUMBER_CELL_HIGHLIGHT_LEAVE_DURATION_MS = 200

// Ancho (mitad, hacia cada lado de centerAngleDeg) del rect de máscara -- no necesita ser
// exacto, solo lo bastante grande para no cortar el costado del path real (que es angosto);
// usar el propio radio externo alcanza de sobra.
const CELL_HIGHLIGHT_MASK_HALF_WIDTH = CELL_HIGHLIGHT_TOP_RADIUS

export type NumberCellHighlightPhase = 'entering' | 'visible' | 'leaving'

interface NumberCellHighlightProps {
  pocket: WheelPocket
  wheelType: WheelType
  phase: NumberCellHighlightPhase
  delayMs?: number
  // Geometría a usar para ubicar la casilla -- por defecto WHEEL_GEOMETRY[wheelType] (modo
  // imagen, mismo comportamiento de siempre). Pasar WHEEL_VIDEO_GEOMETRY[wheelType] (ver
  // layout/wheelVideoGeometry.constants.ts) para dibujar sobre el modo video en vez de la imagen.
  geometry?: PocketGeometry
}

// Resalta la casilla de un número con forma de rectángulo que se abre hacia arriba (borde
// angosto abajo, borde ancho arriba), coloreada según su color real de ruleta, con un glow
// sobre las líneas laterales -- recortado a la propia forma (clipPath) para que el brillo no
// se salga del rectángulo. Componente puramente declarativo: no decide cuándo mostrarse ni por
// cuánto tiempo -- eso lo controla el padre (ver useNumberCellHighlightCycle.ts) a través de
// `phase`. Cuando el padre no debe mostrar este número, simplemente no lo incluye en su lista
// (ni nodo, ni espacio), en vez de pasarle una phase "hidden".
export function NumberCellHighlight({ pocket, wheelType, phase, delayMs = 0, geometry = WHEEL_GEOMETRY[wheelType] }: NumberCellHighlightProps) {
  const { center } = geometry
  const centerAngleDeg = getPocketAngleDegForGeometry(pocket, wheelType, geometry)
  const bottomStartDeg = centerAngleDeg + CELL_HIGHLIGHT_BOTTOM_START_DEG
  const bottomEndDeg = centerAngleDeg + CELL_HIGHLIGHT_BOTTOM_END_DEG
  const topStartDeg = centerAngleDeg + CELL_HIGHLIGHT_TOP_START_DEG
  const topEndDeg = centerAngleDeg + CELL_HIGHLIGHT_TOP_END_DEG

  const path = describeCellFlarePath(
    center,
    CELL_HIGHLIGHT_BOTTOM_RADIUS,
    CELL_HIGHLIGHT_TOP_RADIUS,
    bottomStartDeg,
    bottomEndDeg,
    topStartDeg,
    topEndDeg,
  )
  const style = NUMBER_CELL_HIGHLIGHT_STYLES[getRouletteColor(pocket)]

  // Puntos de las líneas de glow -- corridos hacia adentro (ver CELL_HIGHLIGHT_GLOW_INSET_DEG)
  // respecto de las esquinas reales del rectángulo, para que el halo tenga margen visible antes
  // del clipPath. El path de relleno sigue usando las esquinas reales sin este corrimiento.
  const glowInnerStart = getPolarPoint(center, CELL_HIGHLIGHT_BOTTOM_RADIUS, bottomStartDeg + CELL_HIGHLIGHT_GLOW_INSET_DEG)
  const glowInnerEnd = getPolarPoint(center, CELL_HIGHLIGHT_BOTTOM_RADIUS, bottomEndDeg - CELL_HIGHLIGHT_GLOW_INSET_DEG)
  const glowOuterStart = getPolarPoint(center, CELL_HIGHLIGHT_TOP_RADIUS, topStartDeg + CELL_HIGHLIGHT_GLOW_INSET_DEG)
  const glowOuterEnd = getPolarPoint(center, CELL_HIGHLIGHT_TOP_RADIUS, topEndDeg - CELL_HIGHLIGHT_GLOW_INSET_DEG)

  const idSuffix = `pocket-${pocket}`
  const clipId = `number-cell-highlight-clip-${idSuffix}`
  const glowId = `number-cell-highlight-glow-${idSuffix}`
  const maskClipId = `number-cell-highlight-mask-clip-${idSuffix}`

  // El rect de máscara vive en coordenadas SIN rotar (ancho de sobra, centrado en center.x,
  // desde CELL_HIGHLIGHT_BOTTOM_RADIUS hasta CELL_HIGHLIGHT_TOP_RADIUS) y se alinea a esta
  // casilla con un rotate() de attribute SVG puesto directamente en el propio <rect> --
  // <clipPath> solo respeta formas hijas directas (un <g> envolviendo el rect NO cuenta, queda
  // clipeado a nada). y/height se animan por CSS (no transform: scaleY, porque un transform CSS
  // reemplazaría por completo el rotate() de attribute de este mismo elemento) yendo de "0 de
  // alto pegado al borde inferior" a "alto completo", como una barra de carga de abajo hacia
  // arriba. Los valores de los extremos de la animación son constantes de este archivo, así que
  // viajan como CSS custom properties inline en vez de vivir en el .css.
  const maskAnimationDurationMs = phase === 'leaving' ? NUMBER_CELL_HIGHLIGHT_LEAVE_DURATION_MS : NUMBER_CELL_HIGHLIGHT_ENTER_DURATION_MS
  const maskRectStyle: CSSProperties | undefined =
    phase === 'visible'
      ? undefined
      : ({
          animationDuration: `${maskAnimationDurationMs}ms`,
          animationDelay: `${delayMs}ms`,
          '--number-cell-highlight-mask-collapsed-y': `${center.y - CELL_HIGHLIGHT_BOTTOM_RADIUS}px`,
          '--number-cell-highlight-mask-full-y': `${center.y - CELL_HIGHLIGHT_TOP_RADIUS}px`,
          '--number-cell-highlight-mask-full-height': `${CELL_HIGHLIGHT_TOP_RADIUS - CELL_HIGHLIGHT_BOTTOM_RADIUS}px`,
        } as CSSProperties)
  const maskRectY = phase === 'visible' ? center.y - CELL_HIGHLIGHT_TOP_RADIUS : center.y - CELL_HIGHLIGHT_BOTTOM_RADIUS
  const maskRectHeight = phase === 'visible' ? CELL_HIGHLIGHT_TOP_RADIUS - CELL_HIGHLIGHT_BOTTOM_RADIUS : 0

  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <path d={path} />
        </clipPath>
        <clipPath id={maskClipId}>
          <rect
            className={`number-cell-highlight-mask-rect number-cell-highlight-mask-rect--${phase}`}
            transform={`rotate(${centerAngleDeg}, ${center.x}, ${center.y})`}
            x={center.x - CELL_HIGHLIGHT_MASK_HALF_WIDTH}
            y={maskRectY}
            width={CELL_HIGHLIGHT_MASK_HALF_WIDTH * 2}
            height={maskRectHeight}
            style={maskRectStyle}
          />
        </clipPath>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation={CELL_HIGHLIGHT_GLOW_BLUR} floodColor={style.glow} floodOpacity="1" />
        </filter>
      </defs>
      <g clipPath={`url(#${maskClipId})`}>
        <path className="number-cell-highlight-path" d={path} fill={style.fill} data-number={pocket} />
        <g clipPath={`url(#${clipId})`}>
          <line
            className="number-cell-highlight-glow-line"
            x1={glowInnerStart.x}
            y1={glowInnerStart.y}
            x2={glowOuterStart.x}
            y2={glowOuterStart.y}
            stroke={style.glow}
            strokeWidth={CELL_HIGHLIGHT_GLOW_STROKE_WIDTH}
            filter={`url(#${glowId})`}
          />
          <line
            className="number-cell-highlight-glow-line"
            x1={glowInnerEnd.x}
            y1={glowInnerEnd.y}
            x2={glowOuterEnd.x}
            y2={glowOuterEnd.y}
            stroke={style.glow}
            strokeWidth={CELL_HIGHLIGHT_GLOW_STROKE_WIDTH}
            filter={`url(#${glowId})`}
          />
        </g>
      </g>
    </>
  )
}
