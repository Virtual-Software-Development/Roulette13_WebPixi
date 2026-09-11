import { useCallback, useEffect, useMemo, useRef } from 'react'
import { extend, useTick } from '@pixi/react'
import { BlurFilter, Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { GlowFilter } from 'pixi-filters'
import { useTranslation } from 'react-i18next'
import { useViewport } from '../../hooks/useViewport'
import { useAnimatedProgress } from '../../hooks/useAnimatedProgress'
import { useDrawCycleStore } from '../../store/useDrawCycleStore'
import { LAYOUT } from '../../layout/layout.constants'
import { easeInOutCubic } from '../../utils/easing'
import { drawRoundedPanel } from '../../utils/roundedPanel'
import { drawDiamond } from '../../utils/diamond'
import { createVerticalGradient } from '../../utils/gradients'
import { getRouletteColor } from '../../utils/rouletteColors'
import { getColumnGroupPockets } from '../../utils/columnGroups'
import { formatMoney } from '../../utils/moneyFormat'
import type { WheelPocket } from '../../types/wheel'
import type { LiveTableBetsData, NumberBetTotal } from '../../types/liveTableBets'

extend({ Container, Graphics, Text })

// -----------------------------------------------------------------------------------------------
// HUD de distribución de apuestas (LIVE TABLE BETS) -- overlay puramente informativo, se muestra
// mientras corre el video de resultado (RouletteVideoView). Visibilidad atada directamente a
// useDrawCycleStore.active (misma fuente de verdad que ya usa RouletteVideoView para su propia
// animación de entrada/salida -- ver ese archivo), no hay una segunda bandera "isVisible" propia.
// 100% data-driven vía la prop `data`: highlighted/showChipStack vienen de afuera, este archivo
// nunca compara pockets ni montos entre sí para decidir nada (ver NumberCell más abajo).
// -----------------------------------------------------------------------------------------------

// Panel VERTICAL angosto anclado a la derecha (pedido explícito) -- misma familia de ancho que los
// paneles verticales que ya viven a la izquierda (SpinStatsPanel/NumberPanelHotCold, ~340-380px),
// no el HUD horizontal ancho de la primera versión.
const PANEL_WIDTH = 500
const PANEL_PADDING = 20
// Bajado de 26 -- se veía demasiado agresivo/redondeado en un panel que ahora ocupa todo el alto
// de la pantalla (el radio se nota mucho más en esquinas tan largas). Sutil, no chato.
const CORNER_RADIUS = 8
// Steel blue/gray, no blanco ni brillante -- define el panel, no lo ilumina.
const BORDER_COLOR = 0xa0b9c4
const BORDER_ALPHA = 0.26
const BORDER_WIDTH = 1.4

// Fondo del panel: navy/black extremadamente oscuro con una caída sutil (no un gradient evidente)
// -- ver PANEL_BG_FILL más abajo, reemplaza el flat fill anterior.
const PANEL_BG_TOP = 0x08111a
const PANEL_BG_MID = 0x050c11
const PANEL_BG_BOTTOM = 0x03080d

const GRID_LINE_COLOR = 0x96a5ae
const GRID_LINE_ALPHA = 0.34
const GRID_LINE_WIDTH = 1.2

const TITLE_HEIGHT = 22
const SUBTITLE_GAP = 6
const SUBTITLE_HEIGHT = 16
const HEADER_HEIGHT = TITLE_HEIGHT + SUBTITLE_GAP + SUBTITLE_HEIGHT
const GRID_TOP_GAP = 16
// La grilla de números (0/00 + los 3x12) ocupa esta columna angosta a la izquierda del contenido
// -- docenas y apuestas exteriores viven en una columna propia a la derecha (ver sideColumnWidth
// en LiveTableBetsPanel), no debajo. Menos ancho por celda de número => más alto por celda, para
// mantenerlas legibles (ver ROW_HEIGHT/ZERO_ROW_HEIGHT más abajo).
const NUMBERS_COLUMN_WIDTH = 320
const ZERO_ROW_HEIGHT = 55
// Los grupos (0/00 y la grilla) van pegados entre sí -- sin gap -- para que se lean como una única
// mesa continua, igual que el paño real, en vez de tarjetas separadas. Las líneas de grilla de
// cada celda (GRID_LINE_COLOR) siguen marcando la división entre secciones.
const ZERO_TO_GRID_GAP = 0
// Fila de apuestas de columna ("2 TO 1") -- una celda por cada una de las 3 columnas de la grilla,
// pegada debajo de la última fila (la que contiene 34/35/36) sin gap, mismo criterio que
// ZERO_TO_GRID_GAP=0: se lee como parte de la misma mesa continua, no como una tarjeta aparte.
const COLUMN_ROW_HEIGHT = 55
// La altura de cada una de las 12 filas de número es DINÁMICA (ver rowHeight en
// LiveTableBetsPanel) -- crece para que la grilla llene TODO el alto disponible de pantalla
// (visibleTop..visibleBottom), pedido explícito de que el panel ocupe la totalidad del lado
// derecho en vez de un tamaño fijo derivado del contenido (que dejaba hueco arriba/abajo). Mismo
// criterio que ya usa LeftStatsSidebar con su tarjeta Top10 (una sección flexible absorbe el resto
// del alto). Esta constante es solo el PISO de seguridad -- nunca se ve más chica que esto, aunque
// el viewport disponible fuera muy bajo.
const MIN_ROW_HEIGHT = 62
const BOTTOM_PADDING = 24

// Separación REAL (espacio, no solo la línea de GRID_LINE_*) entre celdas de número -- cada celda
// se dibuja más chica que su "slot" (columnWidth/ROW_HEIGHT), centrada dentro de él, dejando este
// gap como fondo del panel visible alrededor. 0 = comportamiento actual (celdas pegadas). Poner
// cualquiera de los dos en 0 para separar solo en esa dirección (ej. solo entre columnas, filas
// pegadas). El highlight (ver CellHighlight) usa el mismo tamaño ya achicado, así el borde/glow
// sigue exactamente el borde visible de la celda, no el slot completo.
const NUMBER_CELL_GAP_X = 1
const NUMBER_CELL_GAP_Y = 1.5

// Fila FÍSICA de la mesa (no orden 1,2,3...), derivada de las columnas matemáticas ya existentes
// (getColumnGroupPockets) en vez de otro array hardcodeado: la fila de arriba (horizontal) es la
// 3ra columna (3,6,9...36), la del medio la 2da (2,5,8...35), la de abajo la 1ra (1,4,7...34).
const TOP_ROW = getColumnGroupPockets('thirdColumn')
const MIDDLE_ROW = getColumnGroupPockets('secondColumn')
const BOTTOM_ROW = getColumnGroupPockets('firstColumn')

// Transpuesta de esas 3 filas físicas a 12 filas x 3 columnas -- la fila vertical `i` es el mismo
// trío consecutivo {BOTTOM_ROW[i], MIDDLE_ROW[i], TOP_ROW[i]} que forma una columna en la mesa
// horizontal, así que rojo/negro y las apuestas de columna (ver columnAmounts en
// LiveTableBetsPanel) siguen siendo exactamente las mismas, solo gira la orientación visual.
// Orden [BOTTOM_ROW, MIDDLE_ROW, TOP_ROW] (no [TOP_ROW, MIDDLE_ROW, BOTTOM_ROW]) a propósito: leído
// de izquierda a derecha cada fila debe crecer (1,2,3 / 4,5,6 / ... / 34,35,36), como una mesa
// real -- el orden original leía 3,2,1 en la primera fila.
const VERTICAL_ROWS = TOP_ROW.map((_, i) => [BOTTOM_ROW[i], MIDDLE_ROW[i], TOP_ROW[i]])

// Entrada/salida sutil (spec: fade + pequeño desplazamiento, no el slide-desde-afuera-de-pantalla
// que usan los paneles laterales de RouletteLobby) -- este panel vive sobre el video, no al costado.
// Desplazamiento en X (no Y): el panel ahora se ancla al borde derecho, entra deslizándose desde
// ese mismo borde en vez de desde abajo.
const TRANSITION_DURATION_MS = 200
const ENTRY_OFFSET_PX = 16

// Rojo/negro/verde "casino premium", deliberadamente distintos de RED_COLOR/BLACK_COLOR de
// spinStatsColors.ts (esos están afinados para un anillo/glow de dona sobre foto oscurecida, no
// para el fondo de una celda de mesa) -- paleta propia de este panel, mismo criterio que ya usan
// NumberPanelHotCold/SpinStatsPanel con sus colores de sección. Deep crimson/burgundy, black-navy
// y emerald muy oscuro -- nunca rojo/verde puro ni negro plano, con una caída vertical de 3-4
// paradas para dar algo de profundidad sin que se note como "un gradient".
const RED_TOP = 0x92191c
const RED_UPPER_MID = 0x821619
const RED_LOWER_MID = 0x701316
const RED_BOTTOM = 0x5b0f12

const BLACK_TOP = 0x0c1016
const BLACK_MID = 0x090d12
const BLACK_BOTTOM = 0x050a0f

const GREEN_TOP = 0x063c29
const GREEN_MID = 0x043323
const GREEN_BOTTOM = 0x02291c

const PANEL_BG_FILL = createVerticalGradient([
  { offset: 0, color: PANEL_BG_TOP },
  { offset: 0.45, color: PANEL_BG_MID },
  { offset: 1, color: PANEL_BG_BOTTOM },
])
const RED_FILL = createVerticalGradient([
  { offset: 0, color: RED_TOP },
  { offset: 0.4, color: RED_UPPER_MID },
  { offset: 0.7, color: RED_LOWER_MID },
  { offset: 1, color: RED_BOTTOM },
])
const BLACK_FILL = createVerticalGradient([
  { offset: 0, color: BLACK_TOP },
  { offset: 0.5, color: BLACK_MID },
  { offset: 1, color: BLACK_BOTTOM },
])
const GREEN_FILL = createVerticalGradient([
  { offset: 0, color: GREEN_TOP },
  { offset: 0.45, color: GREEN_MID },
  { offset: 1, color: GREEN_BOTTOM },
])

const OUTSIDE_CELL_FILL = 0x0a121a
const OUTSIDE_CELL_ALPHA = 0.85

// Borde "circuito" estático (siempre visible en highlighted, muy tenue) por el que viaja el hot
// spot animado -- ver AnimatedEdgeGlow. HIGHLIGHT_TINT_ALPHA bajó bastante (spec: "la diferencia
// debe ser pequeña, el movimiento del edge debe ser mucho más importante que el cambio de fondo").
const HIGHLIGHT_TRACK_COLOR = 0x9e1715
const HIGHLIGHT_TRACK_ALPHA = 0.4
const HIGHLIGHT_TINT_COLOR = 0xff6825
const HIGHLIGHT_TINT_ALPHA = 0.08

const CHIP_DARK_EDGE = 0xa95a00
const CHIP_GOLD = 0xe89b00
const CHIP_BRIGHT = 0xffc51c
const CHIP_HIGHLIGHT = 0xffe16a

const DIAMOND_RED_FILL = createVerticalGradient([
  { offset: 0, color: 0xb51517 },
  { offset: 0.55, color: 0x8e1013 },
  { offset: 1, color: 0x690b0e },
])
const DIAMOND_RED_STROKE = 0xea3d37
// Un poco más claro que OUTSIDE_CELL_FILL (0x0a121a) a propósito -- si quedan casi idénticos el
// rombo se lee como un simple contorno en vez de "relleno" (visto en la revisión visual contra la
// referencia).
const DIAMOND_BLACK_FILL = 0x18232e
const DIAMOND_BLACK_STROKE = 0xbeb1a5

// Base #E50914, más brillante hacia el centro (#FF2028) -- una lucecita de estado, no un neon dot.
const LIVE_DOT_COLOR = 0xe50914
const LIVE_DOT_CORE_COLOR = 0xff2028

// Blanco cálido (no #FFFFFF puro) para el texto principal, y tonos más apagados para las
// jerarquías secundarias -- ver sección 11-13 del brief.
const TEXT_PRIMARY = 0xf2f0ee
const TEXT_SECONDARY = 0xd4d0cd
const TEXT_MUTED = 0xbdbab7

const HEADER_TITLE_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 17, letterSpacing: 0.6, fill: 0xe9e7e5 })
const HEADER_SUBTITLE_STYLE = new TextStyle({ fontFamily: 'Arial', fontSize: 11.5, letterSpacing: 0.2, fill: TEXT_MUTED })

// Número más suave (jerarquía secundaria) para que el monto -- el dato que ayuda a
// ubicar los focos de apuesta desde lejos -- sea lo que más resalte de la celda.
const NUMBER_TEXT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '500', fontSize: 21, fill: TEXT_SECONDARY })
const AMOUNT_TEXT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '700', fontSize: 16, fill: TEXT_PRIMARY })

// Mismo fontSize/weight/color que NUMBER_TEXT_STYLE a propósito (pedido explícito: "0 y 00 con el
// mismo size que los otros números") -- se mantiene como constante propia (no un alias directo)
// porque ZeroHalf usa su propio offset vertical (ver ZERO_NUMBER_TEXT_Y_OFFSET) y por si el día de
// mañana necesitan volver a divergir.
const ZERO_TEXT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '500', fontSize: 21, fill: TEXT_SECONDARY })
const ZERO_AMOUNT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '700', fontSize: 16, fill: 0xbfe3d1 })

// Posición vertical de número/monto dentro de la celda, relativa al centro (height / 2) -- el
// número usa anchor "top" (queda ARRIBA de este punto) y el monto anchor "bottom" (queda DEBAJO),
// ver NumberCell/ZeroHalf. Subir un offset (acercarlo a 0 o positivo) baja el número; bajar
// AMOUNT_TEXT_Y_OFFSET acerca el monto más al borde inferior de la celda.
const NUMBER_TEXT_Y_OFFSET = -1
// 0/00 se piden más abajo que el resto de la grilla -- offset propio, más alto (más positivo) que
// NUMBER_TEXT_Y_OFFSET, en vez de compartir el mismo valor.
const ZERO_NUMBER_TEXT_Y_OFFSET = 4
const AMOUNT_TEXT_Y_OFFSET = 4

const DOZEN_LABEL_STYLE = new TextStyle({ fontFamily: 'Arial', fontSize: 14, letterSpacing: 0.2, fill: TEXT_MUTED })
const DOZEN_AMOUNT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 16, fill: TEXT_PRIMARY })

const OUTSIDE_LABEL_STYLE = new TextStyle({ fontFamily: 'Arial', fontSize: 14, letterSpacing: 0.2, fill: TEXT_MUTED })
const OUTSIDE_AMOUNT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 15, fill: TEXT_PRIMARY })

// -----------------------------------------------------------------------------------------------
// Edge glow animado (highlighted === true): una corriente de luz naranja/roja que recorre
// PERMANENTEMENTE el perímetro de la celda (top -> right -> bottom -> left -> top), en vez del
// glow estático que había antes. Es 100% Pixi (Graphics + useTick), no CSS -- este componente no
// tiene stylesheet propio (ver comentario de arriba), así que el equivalente de un conic-gradient
// animado se arma a mano: se parametriza el perímetro del rectángulo como una distancia 0..1 y se
// dibuja una cola de segmentos cortos con color/alpha interpolados, sin filters pesados (sin
// blur > 4px, sin animar layout/tamaño -- ver sección 39 del brief).
// -----------------------------------------------------------------------------------------------

const EDGE_GLOW_DURATION_MS = 2800
// Fracción del perímetro "encendida" en un momento dado -- el resto queda como el track tenue
// estático (HIGHLIGHT_TRACK_COLOR, ver sección 21 del brief: "70-80% del perímetro apagado"). OJO:
// la cola tiene una longitud FIJA en px (esta fracción * el perímetro de la celda), no relativa a
// cada lado -- con celdas mucho más anchas que altas (como las de esta grilla, ~107x62), si esa
// longitud supera el lado CORTO (izquierda/derecha, 62px) la cola nunca entra completa ahí: siempre
// queda partida por las dos esquinas a la vez, y se ve difusa/como "oculta" en esos dos lados
// aunque arriba/abajo (el lado largo, 107px) se vea perfecta. 0.22 daba ~74px de cola (> 62px) --
// bajado a 0.12 (~40px) para que quepa entera incluso en el lado más corto.
const EDGE_GLOW_TAIL_FRACTION = 0.12
// Cada segmento se dibuja como una línea corta con cap:'round' (ver drawEdgeGlowTrail) -- si un
// segmento mide MENOS que el ancho de su propio trazo (EDGE_GLOW_BLOOM_WIDTH, el más ancho de los
// dos), la línea deja de leerse lisa: se ve como una fila de "perlas" redondas superpuestas, con
// grosor irregular según cuánto se pisen. Con la cola en 0.12 (~40px de largo), 26 segmentos daban
// ~1.5px cada uno (< 3.5px de bloom) -- bajado a 14 para que cada segmento (~2.9px) vuelva a ser
// más largo que el trazo más ancho. Si TAIL_FRACTION o el tamaño de celda cambian, mantené
// (tail_px / SEGMENTS) claramente por encima de EDGE_GLOW_BLOOM_WIDTH.
const EDGE_GLOW_SEGMENTS = 35
const EDGE_GLOW_SHARP_WIDTH = 1.6
const EDGE_GLOW_BLOOM_WIDTH = 3.5
const EDGE_GLOW_BLOOM_ALPHA = 0.4
const EDGE_GLOW_BLUR_STRENGTH = 4

// dark red (cola) -> hot red -> orange red -> hot orange -> hot core -> tip amarillo cálido, SOLO
// como hot spot puntual al final (sección 20 del brief: "el amarillo solamente como hot spot").
const EDGE_GLOW_STOPS: { t: number; color: number }[] = [
  { t: 0, color: 0x9e1715 },
  { t: 0.35, color: 0xe8321d },
  { t: 0.6, color: 0xff4b1f },
  { t: 0.82, color: 0xff7426 },
  { t: 0.95, color: 0xffb24a },
  { t: 1, color: 0xffd07a },
]

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Interpola linealmente entre los EDGE_GLOW_STOPS según t (0 = cola vieja/tenue, 1 = punta/hot
// spot) -- mismo criterio de interpolación RGB manual que ya usa gradients.ts (FillGradient), pero
// acá hace falta muestrear color POR SEGMENTO (no hay soporte nativo de Pixi para un gradiente a
// lo largo de un stroke con forma arbitraria).
function edgeGlowColorAt(t: number): number {
  const clamped = Math.min(1, Math.max(0, t))
  for (let i = 0; i < EDGE_GLOW_STOPS.length - 1; i++) {
    const a = EDGE_GLOW_STOPS[i]
    const b = EDGE_GLOW_STOPS[i + 1]
    if (clamped > b.t) continue
    const localT = b.t === a.t ? 0 : (clamped - a.t) / (b.t - a.t)
    const ar = (a.color >> 16) & 0xff
    const ag = (a.color >> 8) & 0xff
    const ab = a.color & 0xff
    const br = (b.color >> 16) & 0xff
    const bg = (b.color >> 8) & 0xff
    const bb = b.color & 0xff
    return (Math.round(lerp(ar, br, localT)) << 16) | (Math.round(lerp(ag, bg, localT)) << 8) | Math.round(lerp(ab, bb, localT))
  }
  return EDGE_GLOW_STOPS[EDGE_GLOW_STOPS.length - 1].color
}

// Punto sobre el perímetro de un rectángulo width×height en sentido horario (top -> right ->
// bottom -> left), arrancando en la esquina superior izquierda -- `f` es una fracción 0..1 de
// vuelta completa (se normaliza fuera de [0,1), así los cálculos de cola pueden dar valores
// negativos sin romper nada).
function perimeterPoint(f: number, width: number, height: number): { x: number; y: number } {
  const norm = ((f % 1) + 1) % 1
  const perimeter = 2 * (width + height)
  const d = norm * perimeter
  if (d < width) return { x: d, y: 0 }
  if (d < width + height) return { x: width, y: d - width }
  if (d < 2 * width + height) return { x: width - (d - width - height), y: height }
  return { x: 0, y: height - (d - 2 * width - height) }
}

// Dibuja la cola de luz (EDGE_GLOW_SEGMENTS tramos cortos, cada uno con su propio color/alpha) que
// termina justo en `headProgress` -- se llama una vez por capa (sharp/bloom) en cada tick mientras
// la celda esté highlighted. Las esquinas pueden "cortarse" levemente en el tramo que cruza de un
// lado a otro del rectángulo (línea recta entre dos puntos de lados distintos en vez de seguir el
// ángulo exacto) -- imperceptible dado lo corto de cada segmento frente al perímetro total.
function drawEdgeGlowTrail(g: PixiGraphics, width: number, height: number, headProgress: number, strokeWidth: number, alphaScale: number) {
  g.clear()
  let prev = perimeterPoint(headProgress - EDGE_GLOW_TAIL_FRACTION, width, height)
  for (let i = 1; i <= EDGE_GLOW_SEGMENTS; i++) {
    const t = i / EDGE_GLOW_SEGMENTS
    const point = perimeterPoint(headProgress - EDGE_GLOW_TAIL_FRACTION * (1 - t), width, height)
    const color = edgeGlowColorAt(t)
    const alpha = Math.pow(t, 1.4) * alphaScale
    g.moveTo(prev.x, prev.y)
    g.lineTo(point.x, point.y)
    g.stroke({ width: strokeWidth, color, alpha, cap: 'round' })
    prev = point
  }
}

// pixiGraphics exige `draw` -- acá el dibujo real es imperativo (vía ref, ver AnimatedEdgeGlow),
// así que se le pasa este no-op estable en vez de recrear una función vacía en cada render.
function noopDraw() {}

// Respeta prefers-reduced-motion (sección 40 del brief): el highlight sigue visible (borde +
// posición fija de la "cola"), simplemente no se mueve.
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

// Dos capas -- sharp (definición del borde) + bloom (blur chico detrás, simula el soft glow) --
// ambas viajan sincronizadas porque comparten el mismo progressRef. Mutación DIRECTA de los
// Graphics vía ref en cada tick (sin pasar por React state/re-render, a diferencia de
// useAnimatedProgress) para que animar esto en loop infinito no cueste un re-render de React 60
// veces por segundo por cada celda destacada -- importante porque este panel vive encima del video
// (ver sección 39 del brief, "evitar... causar layout constantemente").
function AnimatedEdgeGlow({ width, height, blurFilter }: { width: number; height: number; blurFilter: BlurFilter }) {
  const sharpRef = useRef<PixiGraphics>(null)
  const bloomRef = useRef<PixiGraphics>(null)
  const reducedMotion = useMemo(prefersReducedMotion, [])
  const progressRef = useRef(reducedMotion ? EDGE_GLOW_TAIL_FRACTION : 0)

  const drawBoth = useCallback(() => {
    if (sharpRef.current) drawEdgeGlowTrail(sharpRef.current, width, height, progressRef.current, EDGE_GLOW_SHARP_WIDTH, 1)
    if (bloomRef.current) drawEdgeGlowTrail(bloomRef.current, width, height, progressRef.current, EDGE_GLOW_BLOOM_WIDTH, EDGE_GLOW_BLOOM_ALPHA)
  }, [width, height])

  useTick((ticker) => {
    if (reducedMotion) return
    progressRef.current = (progressRef.current + ticker.deltaMS / EDGE_GLOW_DURATION_MS) % 1
    drawBoth()
  })

  // Primer frame (y cada vez que cambian width/height, ej. al agrandar el panel) -- sin esto la
  // celda queda sin dibujar hasta el próximo tick real.
  useEffect(() => {
    drawBoth()
  }, [drawBoth])

  return (
    <pixiContainer>
      <pixiGraphics ref={bloomRef} draw={noopDraw} filters={[blurFilter]} />
      <pixiGraphics ref={sharpRef} draw={noopDraw} />
    </pixiContainer>
  )
}

const centerAnchor = { x: 0.5, y: 0.5 }
const topAnchor = { x: 0.5, y: 1 }
const bottomAnchor = { x: 0.5, y: 0 }

// -----------------------------------------------------------------------------------------------

function pocketKey(pocket: WheelPocket): string {
  return String(pocket)
}

// Stack pequeño de fichas doradas (3 elipses superpuestas) -- decorativo, independiente del
// highlight (ver NumberCell: showChipStack y highlighted nunca se asumen juntos). Encogido para
// caber en las celdas mucho más chicas de la grilla vertical (antes 110x74, ahora 120x40).
function ChipStack({ x, y }: { x: number; y: number }) {
  const draw = useCallback((g: PixiGraphics) => {
    g.clear()
    for (let i = 0; i < 3; i++) {
      const cy = -i * 2.6
      g.ellipse(0, cy, 6.5, 2.6)
      g.fill(i === 2 ? CHIP_BRIGHT : CHIP_GOLD)
      g.stroke({ width: 0.8, color: CHIP_DARK_EDGE, alpha: 0.7 })
    }
    // pequeño highlight en la ficha de arriba
    g.ellipse(-1.8, -5.1, 2.2, 0.8)
    g.fill({ color: CHIP_HIGHLIGHT, alpha: 0.75 })
  }, [])
  return <pixiGraphics draw={draw} x={x} y={y} />
}

// Borde "circuito" estático + tinte muy tenue -- la base sobre la que corre AnimatedEdgeGlow (ver
// más arriba). Se dibuja siempre igual sea cual sea el color de la celda (red/black/green pueden
// llevar highlight), por eso vive separado de drawCell.
function drawHighlightTrack(g: PixiGraphics, width: number, height: number, highlighted: boolean) {
  g.clear()
  if (!highlighted) return
  g.rect(0, 0, width, height)
  g.fill({ color: HIGHLIGHT_TINT_COLOR, alpha: HIGHLIGHT_TINT_ALPHA })
  const inset = 1
  g.setStrokeStyle({ width: 1.2, color: HIGHLIGHT_TRACK_COLOR, alpha: HIGHLIGHT_TRACK_ALPHA })
  g.rect(inset, inset, width - inset * 2, height - inset * 2)
  g.stroke()
}

// Track + glow de una celda destacada, pintados en una capa PROPIA por encima de TODA la grilla
// (ver dónde se usa esto en LiveTableBetsPanel) -- si se dibujaran dentro de la celda misma (como
// antes), el stroke queda centrado sobre el borde y ~1px de su ancho sangra hacia la celda vecina;
// esa sangría queda tapada por el fondo opaco de la vecina cada vez que esa vecina se pinta
// DESPUÉS en el árbol (la de abajo siempre, y la de la derecha salvo última columna) -- por eso el
// highlight se veía completo solo en el borde de arriba y "se ocultaba" en los otros tres. Pintar
// esto en una pasada aparte, después de toda la grilla, lo deja siempre completo sin importar la
// posición de la celda dentro de la grilla.
function CellHighlight({ x, y, width, height, blurFilter }: { x: number; y: number; width: number; height: number; blurFilter: BlurFilter }) {
  const drawTrack = useCallback((g: PixiGraphics) => drawHighlightTrack(g, width, height, true), [width, height])
  return (
    <pixiContainer x={x} y={y}>
      <pixiGraphics draw={drawTrack} />
      <AnimatedEdgeGlow width={width} height={height} blurFilter={blurFilter} />
    </pixiContainer>
  )
}

interface NumberCellProps {
  pocket: number
  bet: NumberBetTotal | undefined
  x: number
  y: number
  width: number
  height: number
}

// Celda de número -- el ÚNICO lugar que decide cómo se ve un pocket, y solo pregunta
// `bet?.highlighted`/`bet?.showChipStack`: nunca compara el pocket ni el total contra otro valor
// (ver sección 42 del brief: "el componente no decide qué número lleva highlight"). TABLE_ROWS
// solo trae pockets 1-36 (0/00 los maneja ZeroArea aparte), así que nunca hace falta pasar por
// toWheelPocket acá. El track/glow de highlight NO se dibuja acá -- ver CellHighlight.
function NumberCell({ pocket, bet, x, y, width, height }: NumberCellProps) {
  const color = getRouletteColor(pocket)
  const fill = color === 'red' ? RED_FILL : color === 'green' ? GREEN_FILL : BLACK_FILL
  const showChipStack = bet?.showChipStack ?? false

  const drawCell = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.rect(0, 0, width, height)
      g.fill(fill)
      g.setStrokeStyle({ width: GRID_LINE_WIDTH, color: GRID_LINE_COLOR, alpha: GRID_LINE_ALPHA })
      g.rect(0, 0, width, height)
      g.stroke()
    },
    [fill, width, height],
  )

  return (
    <pixiContainer x={x} y={y}>
      <pixiGraphics draw={drawCell} />
      <pixiText text={String(pocket)} style={NUMBER_TEXT_STYLE} x={width / 2} y={height / 2 + NUMBER_TEXT_Y_OFFSET} anchor={topAnchor} />
      <pixiText text={formatMoney(bet?.total)} style={AMOUNT_TEXT_STYLE} x={width / 2} y={height / 2 + AMOUNT_TEXT_Y_OFFSET} anchor={bottomAnchor} />
      {showChipStack && <ChipStack x={width - 12} y={12} />}
    </pixiContainer>
  )
}

interface ZeroHalfProps {
  label: string
  bet: NumberBetTotal | undefined
  width: number
  height: number
}

// El track/glow de highlight tampoco se dibuja acá -- ver CellHighlight.
function ZeroHalf({ label, bet, width, height }: ZeroHalfProps) {
  const showChipStack = bet?.showChipStack ?? false

  return (
    <pixiContainer>
      <pixiText text={label} style={ZERO_TEXT_STYLE} x={width / 2} y={height / 2 + ZERO_NUMBER_TEXT_Y_OFFSET} anchor={topAnchor} />
      <pixiText text={formatMoney(bet?.total)} style={ZERO_AMOUNT_STYLE} x={width / 2} y={height / 2 + AMOUNT_TEXT_Y_OFFSET} anchor={bottomAnchor} />
      {showChipStack && <ChipStack x={width - 14} y={13} />}
    </pixiContainer>
  )
}

// Zona especial 0/00 -- UNA sola forma continua (fondo verde + borde propio), no dos rectángulos
// sueltos al lado de la grilla. En el layout vertical va arriba de la grilla en vez de al costado
// (00 a la izquierda, 0 a la derecha, dividido por una línea vertical) -- esquinas superiores
// redondeadas para seguir el radius del panel (mismo criterio que la versión horizontal, girado
// 90°, ver sección 9 del brief).
function ZeroArea({
  x,
  y,
  width,
  height,
  zeroBet,
  doubleZeroBet,
}: {
  x: number
  y: number
  width: number
  height: number
  zeroBet: NumberBetTotal | undefined
  doubleZeroBet: NumberBetTotal | undefined
}) {
  const halfWidth = width / 2

  const drawBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      drawRoundedPanel(g, {
        width,
        height,
        // Solo la esquina superior IZQUIERDA -- es la única que coincide con una esquina real del
        // panel (00 está pegado al borde izquierdo). El lado derecho de "0" ya no toca el borde
        // del panel desde que existe la columna lateral (docenas/exteriores) a su derecha, así que
        // esa curvatura pasó a "1st 12" (ver DozenBetCell más abajo), que ahora sí es la esquina
        // real superior derecha.
        corners: { topLeft: 10, topRight: 0, bottomLeft: 0, bottomRight: 0 },
        fill: GREEN_FILL,
        strokeColor: 0x2a9f68,
        strokeWidth: 1.4,
        strokeAlpha: 0.5,
      })
      // Iluminación verde muy discreta pegada al borde superior -- versión adaptada al layout
      // vertical (sección 9 del brief pensaba esto para el borde izquierdo de una mesa horizontal;
      // acá 0/00 quedó como franja arriba, así que el mismo acento va en el borde de arriba).
      g.setStrokeStyle({ width: 1, color: 0x6bffb1, alpha: 0.2 })
      g.moveTo(6, 1)
      g.lineTo(width - 6, 1)
      g.stroke()
      g.setStrokeStyle({ width: GRID_LINE_WIDTH, color: GRID_LINE_COLOR, alpha: GRID_LINE_ALPHA })
      g.moveTo(halfWidth, 0)
      g.lineTo(halfWidth, height)
      g.stroke()
    },
    [width, height, halfWidth],
  )

  return (
    <pixiContainer x={x} y={y}>
      <pixiGraphics draw={drawBackground} />
      <pixiContainer x={0}>
        <ZeroHalf label="00" bet={doubleZeroBet} width={halfWidth} height={height} />
      </pixiContainer>
      <pixiContainer x={halfWidth}>
        <ZeroHalf label="0" bet={zeroBet} width={halfWidth} height={height} />
      </pixiContainer>
    </pixiContainer>
  )
}

interface CellCorners {
  topLeft?: number
  topRight?: number
  bottomLeft?: number
  bottomRight?: number
}

// `corners` opcional -- solo lo usa la primera celda de la columna lateral ("1st 12"), que ahora
// es la que realmente toca la esquina superior derecha del panel (ver comentario en ZeroArea de
// más arriba sobre por qué esa curvatura se movió de "0" para acá).
function OutsideCellBackground({ width, height, corners }: { width: number; height: number; corners?: CellCorners }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      if (corners) {
        drawRoundedPanel(g, {
          width,
          height,
          corners,
          fill: { color: OUTSIDE_CELL_FILL, alpha: OUTSIDE_CELL_ALPHA },
          strokeColor: GRID_LINE_COLOR,
          strokeWidth: GRID_LINE_WIDTH,
          strokeAlpha: GRID_LINE_ALPHA,
        })
        return
      }
      g.rect(0, 0, width, height)
      g.fill({ color: OUTSIDE_CELL_FILL, alpha: OUTSIDE_CELL_ALPHA })
      g.setStrokeStyle({ width: GRID_LINE_WIDTH, color: GRID_LINE_COLOR, alpha: GRID_LINE_ALPHA })
      g.rect(0, 0, width, height)
      g.stroke()
    },
    [width, height, corners],
  )
  return <pixiGraphics draw={draw} />
}

function DozenBetCell({
  x,
  y,
  width,
  height,
  label,
  amount,
  corners,
}: {
  x: number
  y: number
  width: number
  height: number
  label: string
  amount: number | undefined
  corners?: CellCorners
}) {
  return (
    <pixiContainer x={x} y={y}>
      <OutsideCellBackground width={width} height={height} corners={corners} />
      <pixiText text={label} style={DOZEN_LABEL_STYLE} x={width / 2} y={height / 2 - 4} anchor={topAnchor} />
      <pixiText text={formatMoney(amount)} style={DOZEN_AMOUNT_STYLE} x={width / 2} y={height / 2 + 4} anchor={bottomAnchor} />
    </pixiContainer>
  )
}

function RedDiamond({ size = 17 }: { size?: number }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      drawDiamond(g, { width: size, height: size, fill: DIAMOND_RED_FILL, strokeColor: DIAMOND_RED_STROKE, strokeWidth: 1.4 })
    },
    [size],
  )
  return <pixiGraphics draw={draw} x={-size / 2} y={-size / 2} />
}

function BlackDiamond({ size = 17 }: { size?: number }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      drawDiamond(g, { width: size, height: size, fill: DIAMOND_BLACK_FILL, strokeColor: DIAMOND_BLACK_STROKE, strokeWidth: 1.4 })
    },
    [size],
  )
  return <pixiGraphics draw={draw} x={-size / 2} y={-size / 2} />
}

interface OutsideBetCellProps {
  x: number
  y: number
  width: number
  height: number
  label?: string
  amount: number | undefined
  diamond?: 'red' | 'black'
  corners?: CellCorners
}

// Ancho de la zona del diamante (RED/BLACK) -- fija a la izquierda de la celda, no centrada; el
// título+monto ocupan el resto del ancho, igual criterio (label arriba, amount abajo) que el resto
// de las filas de esta columna.
const DIAMOND_ZONE_WIDTH = 70
const DIAMOND_SIZE = 26
// Corrimiento horizontal del diamante dentro de su zona -- negativo lo acerca al borde izquierdo
// de la celda, positivo lo acerca al centro/texto. Ajustá este valor para moverlo más o menos.
const DIAMOND_OFFSET_X = -10

function OutsideBetCell({ x, y, width, height, label, amount, diamond, corners }: OutsideBetCellProps) {
  const hasAmount = typeof amount === 'number' && amount > 0
  // Siempre centrado en el ancho total de la celda -- independiente de dónde quede el diamante
  // (DIAMOND_ZONE_WIDTH/pixiContainer x del diamante, más abajo), así moverlo no corre el texto.
  const textZoneX = width / 2

  return (
    <pixiContainer x={x} y={y}>
      <OutsideCellBackground width={width} height={height} corners={corners} />
      {diamond && (
        <pixiContainer x={DIAMOND_ZONE_WIDTH / 2 + DIAMOND_OFFSET_X} y={height / 2}>
          {diamond === 'red' ? <RedDiamond size={DIAMOND_SIZE} /> : <BlackDiamond size={DIAMOND_SIZE} />}
        </pixiContainer>
      )}
      <pixiText text={label ?? ''} style={OUTSIDE_LABEL_STYLE} x={textZoneX} y={hasAmount ? height / 2 - 4 : height / 2} anchor={hasAmount ? topAnchor : centerAnchor} />
      {hasAmount && <pixiText text={formatMoney(amount)} style={OUTSIDE_AMOUNT_STYLE} x={textZoneX} y={height / 2 + 4} anchor={bottomAnchor} />}
    </pixiContainer>
  )
}

// Lucecita de estado (base #E50914, centro más brillante #FF2028) -- glow chico y contenido, no
// un neon dot grande (sección 14 del brief).
function LiveIndicator({ x, y }: { x: number; y: number }) {
  const drawDot = useCallback((g: PixiGraphics) => {
    g.clear()
    g.circle(0, 0, 5)
    g.fill(LIVE_DOT_COLOR)
    g.circle(0, -0.5, 2.2)
    g.fill(LIVE_DOT_CORE_COLOR)
  }, [])
  const glow = useMemo(() => new GlowFilter({ distance: 6, outerStrength: 1.1, innerStrength: 0, color: LIVE_DOT_CORE_COLOR, quality: 0.4, alpha: 0.6 }), [])
  return <pixiGraphics draw={drawDot} x={x} y={y} filters={[glow]} />
}

// -----------------------------------------------------------------------------------------------

export function LiveTableBetsPanel({ data }: { data: LiveTableBetsData }) {
  const { t } = useTranslation()
  const { visibleRight, visibleTop, visibleBottom } = useViewport()
  const active = useDrawCycleStore((state) => state.active)

  const progress = useAnimatedProgress(active ? 1 : 0, TRANSITION_DURATION_MS, { startAtTarget: true })
  const eased = easeInOutCubic(progress)

  const betsByPocket = useMemo(() => {
    const map = new Map<string, NumberBetTotal>()
    for (const bet of data.numbers) map.set(pocketKey(bet.pocket), bet)
    return map
  }, [data.numbers])

  // Un solo BlurFilter compartido por la capa "bloom" de todas las celdas destacadas en este frame
  // -- parámetros fijos (no dependen del color/estado de ninguna celda), así que una única
  // instancia alcanza en vez de crear una por celda (mismo criterio que ya usaba el GlowFilter
  // compartido de SpinStatsPanel/AccentStatRow). Blur chico (4px) a propósito -- sección 39 del
  // brief: nada de blur pesado mientras esto vive encima del video.
  const edgeGlowBlurFilter = useMemo(() => new BlurFilter({ strength: EDGE_GLOW_BLUR_STRENGTH, quality: 2 }), [])

  const contentWidth = PANEL_WIDTH - PANEL_PADDING * 2
  const columnWidth = NUMBERS_COLUMN_WIDTH / 3

  const zeroTop = PANEL_PADDING + HEADER_HEIGHT + GRID_TOP_GAP
  const gridTop = zeroTop + ZERO_ROW_HEIGHT + ZERO_TO_GRID_GAP

  // Alto disponible real de borde a borde de pantalla (menos el padding estándar) -- el panel debe
  // ocupar TODO este alto (pedido explícito: "que ocupe en su totalidad el lado derecho"), no un
  // tamaño fijo derivado del contenido que dejaba hueco arriba/abajo. Las 12 filas de número son la
  // ÚNICA sección flexible (0/00, la fila de columnas y los paddings se mantienen fijos) -- mismo
  // criterio que ya usa LeftStatsSidebar con su tarjeta Top10.
  const availableHeight = visibleBottom - visibleTop - LAYOUT.padding * 2
  const nonFlexHeight = zeroTop + ZERO_ROW_HEIGHT + COLUMN_ROW_HEIGHT + BOTTOM_PADDING
  const rowHeight = Math.max((availableHeight - nonFlexHeight) / VERTICAL_ROWS.length, MIN_ROW_HEIGHT)
  const gridHeight = rowHeight * VERTICAL_ROWS.length

  const zeroBet = betsByPocket.get(pocketKey(0))
  const doubleZeroBet = betsByPocket.get(pocketKey('00'))
  const numbersHalfWidth = NUMBERS_COLUMN_WIDTH / 2

  // Todas las celdas destacadas (grilla 1-36 + 0/00) se resuelven ACÁ para pintar su track/glow en
  // una única pasada por encima de TODA la grilla -- ver CellHighlight y su comentario sobre por
  // qué no se dibuja dentro de cada celda.
  const highlightedCells: { key: string; x: number; y: number; width: number; height: number }[] = []
  if (doubleZeroBet?.highlighted) {
    highlightedCells.push({ key: '00', x: PANEL_PADDING, y: zeroTop, width: numbersHalfWidth, height: ZERO_ROW_HEIGHT })
  }
  if (zeroBet?.highlighted) {
    highlightedCells.push({ key: '0', x: PANEL_PADDING + numbersHalfWidth, y: zeroTop, width: numbersHalfWidth, height: ZERO_ROW_HEIGHT })
  }
  VERTICAL_ROWS.forEach((row, rowIndex) => {
    row.forEach((pocket, colIndex) => {
      if (betsByPocket.get(pocketKey(pocket))?.highlighted) {
        highlightedCells.push({
          key: String(pocket),
          x: PANEL_PADDING + colIndex * columnWidth + NUMBER_CELL_GAP_X / 2,
          y: gridTop + rowIndex * rowHeight + NUMBER_CELL_GAP_Y / 2,
          width: columnWidth - NUMBER_CELL_GAP_X,
          height: rowHeight - NUMBER_CELL_GAP_Y,
        })
      }
    })
  })

  // Columna lateral (docenas + apuestas exteriores) -- misma altura total que 0/00 + grilla
  // (dividida en partes iguales, una fila por cada uno de los 9 datos: 3 docenas + 6 apuestas
  // exteriores), en vez de ir debajo ocupando todo el ancho. Ancho reducido (ya no ocupa todo lo
  // que queda tras la grilla de números) y ANCLADA AL BORDE DERECHO del panel -- no pegada a la
  // grilla -- para que el espacio sobrante quede como gap entre ambas en vez de como una franja
  // vacía pegada al borde derecho del panel.
  const sideColumnWidth = contentWidth - NUMBERS_COLUMN_WIDTH
  const sideColumnX = PANEL_PADDING + contentWidth - sideColumnWidth
  const sideRowCount = 9
  // Incluye COLUMN_ROW_HEIGHT en el total repartido -- la columna lateral debe seguir ocupando la
  // misma altura total que 0/00 + grilla + fila de columnas, si no queda un hueco de fondo vacío
  // debajo de la última celda lateral (BLACK) mientras la columna de números sigue un poco más.
  const sideCellHeight = (ZERO_ROW_HEIGHT + gridHeight + COLUMN_ROW_HEIGHT) / sideRowCount

  const panelHeight = zeroTop + ZERO_ROW_HEIGHT + gridHeight + COLUMN_ROW_HEIGHT + BOTTOM_PADDING

  const drawBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      drawRoundedPanel(g, {
        width: PANEL_WIDTH,
        height: panelHeight,
        radius: CORNER_RADIUS,
        fill: PANEL_BG_FILL,
        strokeColor: BORDER_COLOR,
        strokeWidth: BORDER_WIDTH,
        strokeAlpha: BORDER_ALPHA,
      })
      // inner border sutil, apenas más chico que el borde exterior
      drawRoundedPanel(g, {
        x: 3,
        y: 3,
        width: PANEL_WIDTH - 6,
        height: panelHeight - 6,
        radius: CORNER_RADIUS - 3,
        strokeColor: BORDER_COLOR,
        strokeWidth: 1,
        strokeAlpha: 0.12,
      })
      // iluminación interna extremadamente discreta pegada arriba (sección 2 del brief) -- una
      // línea, no un halo: se corta a la altura del corner radius para no asomar por la curva.
      g.setStrokeStyle({ width: 1, color: 0xb4cdd7, alpha: 0.08 })
      g.moveTo(CORNER_RADIUS, 1)
      g.lineTo(PANEL_WIDTH - CORNER_RADIUS, 1)
      g.stroke()
    },
    [panelHeight],
  )

  const dozenLabels = [t('liveTableBets.firstDozen'), t('liveTableBets.secondDozen'), t('liveTableBets.thirdDozen')]
  const dozenAmounts = [data.dozens?.firstDozen, data.dozens?.secondDozen, data.dozens?.thirdDozen]

  // Misma etiqueta ("2 TO 1") para las 3 celdas -- así se lee en una mesa real, las tres columnas
  // pagan igual. Orden [firstColumn, secondColumn, thirdColumn] a propósito: coincide con el orden
  // izquierda-a-derecha de VERTICAL_ROWS ya reordenado (colIndex 0 = firstColumn, 1 = secondColumn,
  // 2 = thirdColumn), así cada celda queda pegada debajo de su columna correspondiente.
  const columnBetLabel = t('liveTableBets.column')
  const columnAmounts = [data.columns?.firstColumn, data.columns?.secondColumn, data.columns?.thirdColumn]

  // Anclado al borde DERECHO (pedido explícito) -- mismo criterio que Footer/NumberPanelHotCold
  // usan para anclarse a un borde real de pantalla (visibleRight/visibleTop), no al centro del
  // canvas de diseño. Entra deslizándose desde ese mismo borde (offset en X, no Y).
  const panelX = visibleRight - PANEL_WIDTH - LAYOUT.padding + (1 - eased) * ENTRY_OFFSET_PX
  // Pegado al borde superior del mismo padding que ya usa el alto disponible (availableHeight,
  // ver rowHeight más arriba) -- con panelHeight llenando exactamente ese alto, el panel queda
  // ocupando todo el lado derecho de borde a borde (menos el padding estándar), en vez de flotar
  // con un offset fijo arbitrario.
  const panelY = 32

  return (
    <pixiContainer x={panelX} y={panelY} alpha={eased}>
      <pixiGraphics draw={drawBackground} />

      <LiveIndicator x={PANEL_PADDING + 6} y={PANEL_PADDING + TITLE_HEIGHT / 2} />
      <pixiText text={t('liveTableBets.title')} style={HEADER_TITLE_STYLE} x={PANEL_PADDING + 18} y={PANEL_PADDING + TITLE_HEIGHT / 2} anchor={{ x: 0, y: 0.5 }} />
      <pixiText
        text={t('liveTableBets.subtitle')}
        style={HEADER_SUBTITLE_STYLE}
        x={PANEL_PADDING}
        y={PANEL_PADDING + TITLE_HEIGHT + SUBTITLE_GAP}
      />

      <ZeroArea
        x={PANEL_PADDING}
        y={zeroTop}
        width={NUMBERS_COLUMN_WIDTH}
        height={ZERO_ROW_HEIGHT}
        zeroBet={zeroBet}
        doubleZeroBet={doubleZeroBet}
      />

      {VERTICAL_ROWS.map((row, rowIndex) => (
        <pixiContainer key={rowIndex} y={gridTop + rowIndex * rowHeight}>
          {row.map((pocket, colIndex) => (
            <NumberCell
              key={pocket}
              pocket={pocket}
              bet={betsByPocket.get(pocketKey(pocket))}
              x={PANEL_PADDING + colIndex * columnWidth + NUMBER_CELL_GAP_X / 2}
              y={NUMBER_CELL_GAP_Y / 2}
              width={columnWidth - NUMBER_CELL_GAP_X}
              height={rowHeight - NUMBER_CELL_GAP_Y}
            />
          ))}
        </pixiContainer>
      ))}

      {/* Fila de apuestas de columna ("2 TO 1"), pegada debajo de la última fila (34/35/36) --
          una celda por columna, alineada con columnWidth/NUMBER_CELL_GAP_X igual que las celdas
          de número de arriba. Esquina inferior izquierda redondeada en la primera celda: con esta
          fila nueva, esa celda pasó a tocar la esquina real inferior izquierda del panel. */}
      {columnAmounts.map((amount, colIndex) => (
        <DozenBetCell
          key={`column-${colIndex}`}
          x={PANEL_PADDING + colIndex * columnWidth + NUMBER_CELL_GAP_X / 2}
          y={gridTop + gridHeight}
          width={columnWidth - NUMBER_CELL_GAP_X}
          height={COLUMN_ROW_HEIGHT}
          label={columnBetLabel}
          amount={amount}
          corners={colIndex === 0 ? { bottomLeft: 10 } : undefined}
        />
      ))}

      {/* Track+glow de las celdas destacadas, pintado DESPUÉS de toda la grilla -- ver
          CellHighlight (por qué vive acá y no dentro de cada celda). */}
      {highlightedCells.map((cell) => (
        <CellHighlight key={cell.key} x={cell.x} y={cell.y} width={cell.width} height={cell.height} blurFilter={edgeGlowBlurFilter} />
      ))}

      {/* Columna lateral pegada a la derecha de la grilla -- docenas arriba, apuestas exteriores
          debajo, una fila por dato en vez de pares lado a lado (se adapta mejor a esta columna
          angosta que a un ancho completo). */}
      {dozenLabels.map((label, index) => (
        <DozenBetCell
          key={label}
          x={sideColumnX}
          y={zeroTop + index * sideCellHeight}
          width={sideColumnWidth}
          height={sideCellHeight}
          label={label}
          amount={dozenAmounts[index]}
          corners={index === 0 ? { topRight: 10 } : undefined}
        />
      ))}

      <OutsideBetCell x={sideColumnX} y={zeroTop + 3 * sideCellHeight} width={sideColumnWidth} height={sideCellHeight} label={t('liveTableBets.low')} amount={data.outside?.low} />
      <OutsideBetCell x={sideColumnX} y={zeroTop + 4 * sideCellHeight} width={sideColumnWidth} height={sideCellHeight} label={t('liveTableBets.high')} amount={data.outside?.high} />
      <OutsideBetCell x={sideColumnX} y={zeroTop + 5 * sideCellHeight} width={sideColumnWidth} height={sideCellHeight} label={t('liveTableBets.even')} amount={data.outside?.even} />
      <OutsideBetCell x={sideColumnX} y={zeroTop + 6 * sideCellHeight} width={sideColumnWidth} height={sideCellHeight} label={t('liveTableBets.odd')} amount={data.outside?.odd} />
      <OutsideBetCell x={sideColumnX} y={zeroTop + 7 * sideCellHeight} width={sideColumnWidth} height={sideCellHeight} diamond="red" label={t('liveTableBets.red')} amount={data.outside?.red} />
      <OutsideBetCell
        x={sideColumnX}
        y={zeroTop + 8 * sideCellHeight}
        width={sideColumnWidth}
        height={sideCellHeight}
        diamond="black"
        label={t('liveTableBets.black')}
        amount={data.outside?.black}
        corners={{ bottomRight: 10 }}
      />
    </pixiContainer>
  )
}
