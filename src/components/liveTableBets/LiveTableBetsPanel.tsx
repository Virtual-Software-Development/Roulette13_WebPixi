import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { extend, useTick } from '@pixi/react'
import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { GlowFilter } from 'pixi-filters'
import { useTranslation } from 'react-i18next'
import { EdgeGlowFilter, EDGE_GLOW_TAIL_FRACTION } from '../../pixi/filters/EdgeGlowFilter'
import { useViewport } from '../../hooks/useViewport'
import { useAnimatedProgress } from '../../hooks/useAnimatedProgress'
import { useDrawCycleStore } from '../../store/useDrawCycleStore'
import { useTexture } from '../../hooks/useTexture'
import { LAYOUT } from '../../layout/layout.constants'
import { easeInOutCubic } from '../../utils/easing'
import { drawRoundedPanel } from '../../utils/roundedPanel'
import { drawDiamond } from '../../utils/diamond'
import { createVerticalGradient } from '../../utils/gradients'
import { getRouletteColor } from '../../utils/rouletteColors'
import { getColumnGroupPockets } from '../../utils/columnGroups'
import { formatMoney } from '../../utils/moneyFormat'
import { buildMediaUrl } from '../../utils/media'
import type { WheelPocket } from '../../types/wheel'
import type { LiveTableBetsData, NumberBetTotal } from '../../types/liveTableBets'

extend({ Container, Graphics, Sprite, Text })

// Set Website_svg_icons (ver local-media/) -- reemplaza al stack de fichas doradas dibujado a mano.
const CHIP_STACK_ICON_URL = buildMediaUrl('Website_svg_icons/06_gold_chips_stack.svg')

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
// Mismo problema y mismo fix que useAnimatedProgress.ts (ver su comentario largo ahí): Pixi Ticker
// clampea deltaMS a 100ms por tick, lo que estira esta animación (permanente mientras la celda
// esté destacada) bajo CPU throttling agresivo -- se mide con performance.now() en vez de confiar
// en ticker.deltaMS más abajo (AnimatedEdgeGlow), el ticker de Pixi sigue usándose solo para saber
// CUÁNDO re-evaluar (useTick), no para la magnitud del paso.
const EDGE_GLOW_MAX_STEP_MS = 250
// Fracción del perímetro "encendida" en un momento dado -- el resto queda como el track tenue
// estático (HIGHLIGHT_TRACK_COLOR, ver sección 21 del brief: "70-80% del perímetro apagado"). OJO:
// la cola tiene una longitud FIJA en px (esta fracción * el perímetro de la celda), no relativa a
// cada lado -- con celdas mucho más anchas que altas (como las de esta grilla, ~107x62), si esa
// longitud supera el lado CORTO (izquierda/derecha, 62px) la cola nunca entra completa ahí: siempre
// queda partida por las dos esquinas a la vez, y se ve difusa/como "oculta" en esos dos lados
// aunque arriba/abajo (el lado largo, 107px) se vea perfecta. 0.22 daba ~74px de cola (> 62px) --
// bajado a 0.12 (~40px) para que quepa entera incluso en el lado más corto.
// Respeta prefers-reduced-motion (sección 40 del brief): el highlight sigue visible (borde +
// posición fija de la "cola"), simplemente no se mueve.
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

// El cometa (cola de luz + halo) se calcula enteramente en GPU vía EdgeGlowFilter (ver
// src/pixi/filters/EdgeGlowFilter.ts) -- la geometría base (un rect transparente) se dibuja UNA
// sola vez al montar/redimensionar, y el único trabajo por frame es reescribir el uniform
// `progress` del filtro (sin re-render de React, sin rebuild de Graphics). Reemplaza al enfoque
// anterior (35 segmentos de Graphics + BlurFilter por celda, redibujados cada tick).
function AnimatedEdgeGlow({ width, height }: { width: number; height: number }) {
  const filter = useMemo(() => new EdgeGlowFilter({ width, height }), []) // eslint-disable-line react-hooks/exhaustive-deps -- instancia estable por celda, width/height se actualizan vía setters abajo
  const reducedMotion = useMemo(prefersReducedMotion, [])
  const progressRef = useRef(reducedMotion ? EDGE_GLOW_TAIL_FRACTION : 0)
  // null mientras reducedMotion (nunca tickea) -- mismo criterio que useAnimatedProgress.lastTimeRef.
  const lastTimeRef = useRef<number | null>(null)

  useEffect(() => {
    filter.width = width
    filter.height = height
  }, [filter, width, height])

  useEffect(() => () => filter.destroy(), [filter])

  useTick(() => {
    if (reducedMotion) return

    const now = performance.now()
    const elapsedMs = lastTimeRef.current === null ? 0 : Math.min(now - lastTimeRef.current, EDGE_GLOW_MAX_STEP_MS)
    lastTimeRef.current = now

    progressRef.current = (progressRef.current + elapsedMs / EDGE_GLOW_DURATION_MS) % 1
    filter.progress = progressRef.current
  })

  // Primer frame -- sin esto el filtro queda con progress=0 hasta el próximo tick real.
  useEffect(() => {
    filter.progress = progressRef.current
  }, [filter])

  const drawBase = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.rect(0, 0, width, height)
      g.fill({ color: 0xffffff, alpha: 0 })
    },
    [width, height],
  )

  return <pixiGraphics draw={drawBase} filters={[filter]} />
}

const centerAnchor = { x: 0.5, y: 0.5 }
const topAnchor = { x: 0.5, y: 1 }
const bottomAnchor = { x: 0.5, y: 0 }

// -----------------------------------------------------------------------------------------------

function pocketKey(pocket: WheelPocket): string {
  return String(pocket)
}

// Stack de fichas doradas -- decorativo, independiente del highlight (ver NumberCell:
// showChipStack y highlighted nunca se asumen juntos). Encogido para caber en las celdas mucho más
// chicas de la grilla vertical (antes 110x74, ahora 120x40).
const CHIP_STACK_SIZE = 20

function ChipStack({ x, y }: { x: number; y: number }) {
  const { texture } = useTexture(CHIP_STACK_ICON_URL)
  if (!texture) return null
  return (
    <pixiSprite
      texture={texture}
      x={x}
      y={y}
      width={CHIP_STACK_SIZE}
      height={CHIP_STACK_SIZE}
      anchor={{ x: 0.5, y: 0.5 }}
    />
  )
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
// memo: x/y/width/height son primitivos derivados de `data`/layout, ninguno depende de `eased` --
// sin esto, cada tick de la animación de entrada/salida del panel (useAnimatedProgress, ver
// LiveTableBetsPanel) reconciliaba las hasta 10 instancias de CellHighlight/AnimatedEdgeGlow de
// nuevo aunque nada suyo hubiera cambiado.
const CellHighlight = memo(function CellHighlight({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  const drawTrack = useCallback((g: PixiGraphics) => drawHighlightTrack(g, width, height, true), [width, height])
  return (
    <pixiContainer x={x} y={y}>
      <pixiGraphics draw={drawTrack} />
      <AnimatedEdgeGlow width={width} height={height} />
    </pixiContainer>
  )
})

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
//
// memo: `bet` viene de un Map memoizado por `data.numbers` (ver betsByPocket en
// LiveTableBetsPanel) -- durante los ticks de la animación de entrada/salida del panel (que no
// tocan `data`), la referencia de `bet` no cambia para ninguna de las 36 celdas, así que memo
// evita reconciliarlas todas en cada tick.
const NumberCell = memo(function NumberCell({ pocket, bet, x, y, width, height }: NumberCellProps) {
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
})

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
// memo: mismo criterio que NumberCell -- zeroBet/doubleZeroBet vienen del mismo Map memoizado, no
// cambian de referencia durante los ticks de entrada/salida del panel.
const ZeroArea = memo(function ZeroArea({
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
})

interface CellCorners {
  topLeft?: number
  topRight?: number
  bottomLeft?: number
  bottomRight?: number
}

// Objetos `corners` estables (no literales inline en el JSX) -- DozenBetCell/OutsideBetCell están
// memoizados (ver más abajo) comparando props por referencia; un literal `{ bottomLeft: 10 }`
// nuevo en cada render del padre haría que memo viera "cambió" en cada tick de la animación de
// entrada/salida del panel, aunque el valor sea idéntico.
const BOTTOM_LEFT_CORNER: CellCorners = { bottomLeft: 10 }
const TOP_RIGHT_CORNER: CellCorners = { topRight: 10 }
const BOTTOM_RIGHT_CORNER: CellCorners = { bottomRight: 10 }

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

// memo: label/amount/corners son primitivos (o undefined) que no cambian durante los ticks de
// entrada/salida del panel -- evita reconciliar las 6 instancias (3 columnas + 3 docenas) en cada
// uno de esos ticks.
const DozenBetCell = memo(function DozenBetCell({
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
})

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

// memo: label/amount/diamond/corners son todos primitivos (o las constantes CORNER de arriba),
// estables durante los ticks de entrada/salida del panel.
const OutsideBetCell = memo(function OutsideBetCell({ x, y, width, height, label, amount, diamond, corners }: OutsideBetCellProps) {
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
})

// Lucecita de estado (base #E50914, centro más brillante #FF2028) -- glow chico y contenido, no
// un neon dot grande (sección 14 del brief).
//
// memo: instancia única, pero evita re-ejecutar el componente (y reconciliar su Graphics con
// filtro) en cada tick de entrada/salida del panel -- x/y son constantes fijas del header.
const LiveIndicator = memo(function LiveIndicator({ x, y }: { x: number; y: number }) {
  const drawDot = useCallback((g: PixiGraphics) => {
    g.clear()
    g.circle(0, 0, 5)
    g.fill(LIVE_DOT_COLOR)
    g.circle(0, -0.5, 2.2)
    g.fill(LIVE_DOT_CORE_COLOR)
  }, [])
  const glow = useMemo(() => new GlowFilter({ distance: 6, outerStrength: 1.1, innerStrength: 0, color: LIVE_DOT_CORE_COLOR, quality: 0.4, alpha: 0.6 }), [])
  return <pixiGraphics draw={drawDot} x={x} y={y} filters={[glow]} />
})

// -----------------------------------------------------------------------------------------------

export function LiveTableBetsPanel({ data }: { data: LiveTableBetsData }) {
  const { t } = useTranslation()
  const { visibleRight, visibleTop, visibleBottom } = useViewport()
  const active = useDrawCycleStore((state) => state.active)
  const videoArrived = useDrawCycleStore((state) => state.videoArrived)

  // Espera a que el video termine de subir del todo antes de entrar (ver
  // useDrawCycleStore.videoArrived) -- si no, este panel (highlight/glow incluido) termina su
  // propio fade-in (550ms) bastante antes de que el video termine el suyo (900ms, deliberadamente
  // más lento), mismo `active` no dice nada sobre eso. La SALIDA no espera nada: `active` en false
  // ya alcanza para bajar a 0 en el mismo instante que antes.
  const progress = useAnimatedProgress(active && videoArrived ? 1 : 0, TRANSITION_DURATION_MS, { startAtTarget: true })
  const eased = easeInOutCubic(progress)

  const betsByPocket = useMemo(() => {
    const map = new Map<string, NumberBetTotal>()
    for (const bet of data.numbers) map.set(pocketKey(bet.pocket), bet)
    return map
  }, [data.numbers])

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
  //
  // panelFullyEntered: el highlight (track+glow animado) solo se enciende una vez que el panel
  // TERMINÓ su propia animación de entrada (progress===1), en vez de encenderse a la par del
  // fade-in -- si no, el comet trail ya se ve corriendo (y el halo ya visible) desde la mitad de
  // la transición de opacidad del panel, dando la sensación de que el highlight "llega antes" que
  // el propio panel. La salida sigue sin esperar nada (progress deja de ser 1 apenas empieza a
  // bajar, así que el highlight se apaga de inmediato junto con el resto).
  const panelFullyEntered = progress === 1
  const highlightedCells: { key: string; x: number; y: number; width: number; height: number }[] = []
  if (panelFullyEntered) {
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
  }

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
          corners={colIndex === 0 ? BOTTOM_LEFT_CORNER : undefined}
        />
      ))}

      {/* Track+glow de las celdas destacadas, pintado DESPUÉS de toda la grilla -- ver
          CellHighlight (por qué vive acá y no dentro de cada celda). */}
      {highlightedCells.map((cell) => (
        <CellHighlight key={cell.key} x={cell.x} y={cell.y} width={cell.width} height={cell.height} />
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
          corners={index === 0 ? TOP_RIGHT_CORNER : undefined}
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
        corners={BOTTOM_RIGHT_CORNER}
      />
    </pixiContainer>
  )
}
