import type { CSSProperties } from 'react'
import { describeCellFlarePath, getPocketAngleDegForGeometry, getPolarPoint } from '../../utils/wheelPositions'
import type { PocketGeometry } from '../../utils/wheelPositions'
import { getRouletteColor } from '../../utils/rouletteColors'
import { NUMBER_CELL_HIGHLIGHT_STYLES } from './numberCellHighlightStyles'
import { WHEEL_GEOMETRY } from '../../layout/wheelGeometry.constants'
import { getEffectiveWheelRenderMode } from '../../data/wheelRenderMode'
import type { WheelPocket, WheelType } from '../../types/wheel'
import './NumberCellHighlight.css'

// Radio del borde de abajo (más cerca del centro de la rueda) y de arriba (más afuera) -- no
// hay dato medido contra el PNG real (a diferencia de WHEEL_GEOMETRY.radius), así que quedan
// acá como constantes de referencia a ajustar a mano, calibradas contra el radio de la
// geometría de IMAGEN (WHEEL_GEOMETRY[wheelType].radius). Mover cualquiera de las dos cambia el
// LARGO del rectángulo (la distancia entre el borde de abajo y el de arriba). Para otras
// geometrías (p.ej. modo video, con su propio radio) se reescalan proporcionalmente dentro del
// componente -- ver radiusScale más abajo -- para no quedar hardcodeadas a las unidades del
// canvas de imagen.
const CELL_HIGHLIGHT_BOTTOM_RADIUS = 260
const CELL_HIGHLIGHT_TOP_RADIUS = 480

// Corrección residual SOLO para modo video -- WHEEL_VIDEO_GEOMETRY.center/radius se midieron
// contra un video con perspectiva de cámara real (Hough circle sobre el borde exterior de la
// rueda + barrido de color sobre el anillo de números, ver el comentario largo en
// layout/wheelVideoGeometry.constants.ts), así que no calzan 100% exacto con el reescalado
// proporcional de más abajo -- a diferencia del PNG (render cenital, sin perspectiva, donde el
// reescalado ya da el resultado exacto). Ajustar a mano viendo el video en vivo: subir el radio
// agranda el rectángulo hacia ambos lados por igual, subir el offset de centro lo corre a la
// derecha. En modo imagen ninguno de los dos se aplica (ver isVideoMode más abajo).
const CELL_HIGHLIGHT_VIDEO_RADIUS_BONUS = 15
const CELL_HIGHLIGHT_VIDEO_CENTER_X_OFFSET = 8

// Cada una de las 4 esquinas del rectángulo se mueve de forma independiente con su propio
// valor: son grados de offset respecto al ángulo central de la casilla (getPocketAngleDeg),
// hacia el lado "start" (negativo) o "end" (positivo). No están atados al ancho real de la
// casilla ni se recortan contra ella -- moverlos como se necesite para dar el ancho deseado.
const CELL_HIGHLIGHT_BOTTOM_START_DEG = -4.5 // esquina inferior izquierda
const CELL_HIGHLIGHT_BOTTOM_END_DEG = 4.5 // esquina inferior derecha
const CELL_HIGHLIGHT_TOP_START_DEG = -6 // esquina superior izquierda
const CELL_HIGHLIGHT_TOP_END_DEG = 6 // esquina superior derecha

// Glow de las líneas laterales -- mismo color que se le envía a la casilla (style.glow). Técnica
// de neón de dos capas (ver el filtro más abajo): un blur ancho y suave (CELL_HIGHLIGHT_GLOW_BLUR)
// para el halo que se difumina lejos de la línea, uno angosto (CELL_HIGHLIGHT_GLOW_CORE_BLUR) para
// que se note un núcleo brillante pegado a la línea, y la línea nítida encima de ambos -- un solo
// feDropShadow con un blur grande (como antes) se veía "lavado" porque toda la luz quedaba
// repartida en un área enorme sin nada de brillo concentrado cerca de la línea. Ajustar a mano.
const CELL_HIGHLIGHT_GLOW_BLUR = 50
const CELL_HIGHLIGHT_GLOW_CORE_BLUR = 8
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

export type NumberCellHighlightPhase = 'entering' | 'visible' | 'leaving'

interface NumberCellHighlightProps {
  pocket: WheelPocket
  wheelType: WheelType
  phase: NumberCellHighlightPhase
  delayMs?: number
  // Color de fill+glow -- por defecto el color real de ruleta (rojo/negro/verde) de la propia
  // casilla. Pasar uno explícito para resaltar según otro criterio en vez del propio de la casilla
  // (ver useCategoryHighlightEntries: todas las casillas de una categoría -- red/black/even/odd/
  // high/low -- comparten UN mismo color).
  color?: string
  // Geometría a usar para ubicar la casilla -- por defecto WHEEL_GEOMETRY[wheelType] (modo
  // imagen, mismo comportamiento de siempre). Pasar WHEEL_VIDEO_GEOMETRY[wheelType] (ver
  // layout/wheelVideoGeometry.constants.ts) para dibujar sobre el modo video en vez de la imagen.
  geometry?: PocketGeometry
}

// Resalta la casilla de un número con forma de rectángulo que se abre hacia arriba (borde
// angosto abajo, borde ancho arriba), coloreada según su color real de ruleta, con las líneas
// laterales dibujadas ENCIMA del relleno (van después en el JSX, ver más abajo) y con glow de
// neón de dos capas -- el halo se deja sin clipear a la forma angosta del rectángulo para que se
// note difuminándose hacia afuera. Componente puramente declarativo: no decide cuándo mostrarse
// ni por cuánto tiempo -- eso lo controla el padre (ver useNumberCellHighlightCycle.ts) a través
// de `phase`. Cuando el padre no debe mostrar este número, simplemente no lo incluye en su lista
// (ni nodo, ni espacio), en vez de pasarle una phase "hidden".
export function NumberCellHighlight({ pocket, wheelType, phase, delayMs = 0, color, geometry = WHEEL_GEOMETRY[wheelType] }: NumberCellHighlightProps) {
  const isVideoMode = getEffectiveWheelRenderMode(wheelType) === 'video'
  // Corrimiento de centro solo en modo video (ver CELL_HIGHLIGHT_VIDEO_CENTER_X_OFFSET) -- no
  // muta geometry.center (compartido con otros consumidores de la misma geometría).
  const center = isVideoMode ? { x: geometry.center.x + CELL_HIGHLIGHT_VIDEO_CENTER_X_OFFSET, y: geometry.center.y } : geometry.center
  // Reescala las constantes de referencia (calibradas contra WHEEL_GEOMETRY, modo imagen) al
  // radio real de la geometría recibida -- da 1 (sin cambios) en modo imagen, y en modo video
  // (radio distinto) mantiene la misma proporción relativa al tamaño del anillo. El bonus fijo
  // solo se suma en modo video (ver CELL_HIGHLIGHT_VIDEO_RADIUS_BONUS).
  const radiusScale = geometry.radius / WHEEL_GEOMETRY[wheelType].radius
  const videoRadiusBonus = isVideoMode ? CELL_HIGHLIGHT_VIDEO_RADIUS_BONUS : 0
  const bottomRadius = CELL_HIGHLIGHT_BOTTOM_RADIUS * radiusScale + videoRadiusBonus
  const topRadius = CELL_HIGHLIGHT_TOP_RADIUS * radiusScale + videoRadiusBonus
  const centerAngleDeg = getPocketAngleDegForGeometry(pocket, wheelType, geometry)
  const bottomStartDeg = centerAngleDeg + CELL_HIGHLIGHT_BOTTOM_START_DEG
  const bottomEndDeg = centerAngleDeg + CELL_HIGHLIGHT_BOTTOM_END_DEG
  const topStartDeg = centerAngleDeg + CELL_HIGHLIGHT_TOP_START_DEG
  const topEndDeg = centerAngleDeg + CELL_HIGHLIGHT_TOP_END_DEG

  const path = describeCellFlarePath(center, bottomRadius, topRadius, bottomStartDeg, bottomEndDeg, topStartDeg, topEndDeg)
  const resolvedColor = color ?? NUMBER_CELL_HIGHLIGHT_STYLES[getRouletteColor(pocket)].fill

  // Puntos de las líneas de glow -- corridos levemente hacia adentro (ver
  // CELL_HIGHLIGHT_GLOW_INSET_DEG) respecto de las esquinas reales del rectángulo, para que no
  // queden exactamente pegadas al borde del path de relleno (que sí usa las esquinas reales sin
  // este corrimiento). El halo del feDropShadow se deja SIN clipear (ver más abajo) para que se
  // note el brillo difuminándose hacia afuera -- clipearlo a la forma angosta del propio
  // rectángulo cortaba casi todo el blur antes de que llegara a verse, dejando solo dos líneas
  // duras sin halo visible.
  const glowInnerStart = getPolarPoint(center, bottomRadius, bottomStartDeg + CELL_HIGHLIGHT_GLOW_INSET_DEG)
  const glowInnerEnd = getPolarPoint(center, bottomRadius, bottomEndDeg - CELL_HIGHLIGHT_GLOW_INSET_DEG)
  const glowOuterStart = getPolarPoint(center, topRadius, topStartDeg + CELL_HIGHLIGHT_GLOW_INSET_DEG)
  const glowOuterEnd = getPolarPoint(center, topRadius, topEndDeg - CELL_HIGHLIGHT_GLOW_INSET_DEG)

  const idSuffix = `pocket-${pocket}`
  const glowId = `number-cell-highlight-glow-${idSuffix}`
  const maskClipId = `number-cell-highlight-mask-clip-${idSuffix}`

  // El rect de máscara vive en coordenadas SIN rotar (ancho de sobra, centrado en center.x,
  // desde bottomRadius hasta topRadius) y se alinea a esta
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
          '--number-cell-highlight-mask-collapsed-y': `${center.y - bottomRadius}px`,
          '--number-cell-highlight-mask-full-y': `${center.y - topRadius}px`,
          '--number-cell-highlight-mask-full-height': `${topRadius - bottomRadius}px`,
        } as CSSProperties)
  const maskRectY = phase === 'visible' ? center.y - topRadius : center.y - bottomRadius
  const maskRectHeight = phase === 'visible' ? topRadius - bottomRadius : 0
  // Ancho (mitad, hacia cada lado de centerAngleDeg) del rect de máscara -- no necesita ser
  // exacto, solo lo bastante grande para no cortar el costado del path real (que es angosto);
  // usar el propio radio externo (ya reescalado) alcanza de sobra.
  const maskHalfWidth = topRadius

  return (
    <>
      <defs>
        <clipPath id={maskClipId}>
          <rect
            className={`number-cell-highlight-mask-rect number-cell-highlight-mask-rect--${phase}`}
            transform={`rotate(${centerAngleDeg}, ${center.x}, ${center.y})`}
            x={center.x - maskHalfWidth}
            y={maskRectY}
            width={maskHalfWidth * 2}
            height={maskRectHeight}
            style={maskRectStyle}
          />
        </clipPath>
        <filter id={glowId} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={CELL_HIGHLIGHT_GLOW_BLUR} result="wideHalo" />
          <feGaussianBlur in="SourceGraphic" stdDeviation={CELL_HIGHLIGHT_GLOW_CORE_BLUR} result="coreHalo" />
          <feMerge>
            <feMergeNode in="wideHalo" />
            <feMergeNode in="coreHalo" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g clipPath={`url(#${maskClipId})`}>
        <path className="number-cell-highlight-path" d={path} fill={resolvedColor} data-number={pocket} />
        <line
          className="number-cell-highlight-glow-line"
          x1={glowInnerStart.x}
          y1={glowInnerStart.y}
          x2={glowOuterStart.x}
          y2={glowOuterStart.y}
          stroke={resolvedColor}
          strokeWidth={CELL_HIGHLIGHT_GLOW_STROKE_WIDTH}
          filter={`url(#${glowId})`}
        />
        <line
          className="number-cell-highlight-glow-line"
          x1={glowInnerEnd.x}
          y1={glowInnerEnd.y}
          x2={glowOuterEnd.x}
          y2={glowOuterEnd.y}
          stroke={resolvedColor}
          strokeWidth={CELL_HIGHLIGHT_GLOW_STROKE_WIDTH}
          filter={`url(#${glowId})`}
        />
      </g>
    </>
  )
}
