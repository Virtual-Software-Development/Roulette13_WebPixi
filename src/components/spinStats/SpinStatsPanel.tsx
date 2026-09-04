import { useCallback, useMemo, useState } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { GlowFilter } from 'pixi-filters'
import { useTranslation } from 'react-i18next'
import { useResultsStore } from '../../store/useResultsStore'
import { useSpinStatsCycle } from '../../hooks/useSpinStatsCycle'
import { useViewport } from '../../hooks/useViewport'
import { useAnimatedProgress } from '../../hooks/useAnimatedProgress'
import { easeInOutCubic } from '../../utils/easing'
import { computeSpinStats } from '../../utils/spinStats'
import {
  RED_COLOR,
  BLACK_COLOR,
  EVEN_COLOR,
  ODD_COLOR,
  HIGH_COLOR,
  LOW_COLOR,
  FIRST_GROUP_COLOR,
  SECOND_GROUP_COLOR,
  THIRD_GROUP_COLOR,
} from '../../utils/spinStatsColors'
import { LAYOUT, TRANSITION_DURATION_MS } from '../../layout/layout.constants'

extend({ Container, Graphics, Text })

// Cuántos spins entran en el cálculo -- editable acá, un solo lugar (título y useMemo lo leen de
// esta misma constante, nunca hardcodeado aparte).
const LAST_SPINS_LIMIT = 100

const CONTENT_WIDTH = 230 // solo para centrar título/textos -- ya no hay panel de fondo que lo delimite
const TITLE_HEIGHT = 26
const TITLE_GAP = 14
const DONUT_OUTER_RADIUS = 110
// Grosor del anillo de color, independiente de DONUT_OUTER_RADIUS -- antes salía de
// DONUT_OUTER_RADIUS - DONUT_INNER_RADIUS, así que agrandar el radio también engordaba el
// stroke sin querer. Ahora el ancho del trazo se fija acá directo; el radio del círculo sobre el
// que se dibuja (midRadius, en Donut) se calcula como DONUT_OUTER_RADIUS - DONUT_RING_WIDTH / 2,
// para que el borde de afuera del anillo siga cayendo justo en DONUT_OUTER_RADIUS.
const DONUT_RING_WIDTH = 16
// Separación entre una dona y la siguiente, apiladas verticalmente -- bajado de 120 (quedaba
// enorme sin el caption y con las donas más grandes) a algo más ajustado.
const BLOCK_GAP = 26

// Cuánto sube el panel al ocultarse -- deliberadamente más grande que el SIDE_EXIT_DISTANCE (550)
// que comparten Header/Footer/NumberPanelHotCold: el contenido de acá (título + 3 donas apiladas)
// mide ~750px de alto, más que esos paneles, así que 550 dejaba el borde de abajo todavía visible
// en pantalla incluso con la animación de salida completa.
const PANEL_EXIT_DISTANCE = 850

// Margen extra al final de la máscara -- el glow del segmento activo (ver ACTIVE_GLOW_DISTANCE
// más abajo) se difumina más allá del radio nominal del anillo (DONUT_OUTER_RADIUS), así que sin
// este margen la ÚLTIMA dona apilada (high/low en fase 1) quedaba con su glow cortado en seco por
// el borde de abajo de la máscara justo cuando se encendía. Ver PHASE_MASK_CONTENT_HEIGHT.
const MASK_BOTTOM_MARGIN = 60

// Alto del contenido que tapa/revela la máscara entre fase 1 y fase 2 (ver drawMask más abajo) --
// el de fase 1 (3 donas: color/even-odd/high-low), más alto que fase 2 (2 donas: docenas/
// columnas), así alcanza de sobra para cualquiera de los dos sets sin recortar de más.
const PHASE_MASK_CONTENT_HEIGHT = 3 * (DONUT_OUTER_RADIUS * 2) + 2 * BLOCK_GAP + MASK_BOTTOM_MARGIN

// Track (fondo) de cada dona -- se ve donde ningún segmento cubre, p.ej. la porción de spins en
// 0/00 en los gráficos que no los cuentan en ninguna categoría (par/impar, alto/bajo, docena,
// columna): en vez de un 4to segmento/leyenda aparte, queda como un hueco sin colorear.
const DONUT_TRACK_COLOR = 0x22222c
// Líneas divisorias doradas -- SIEMPRE en partes iguales, no a la proporción real del anillo:
// separan las zonas de texto para que se puedan leer, el anillo de afuera es el que muestra la
// proporción real. Mismo dorado que ya usa el glow del chip ganador (GameRow.tsx). La CANTIDAD de
// líneas es independiente de cuántos segmentos tenga el gráfico -- ver DonutBlock.lineCount: 1
// dibuja una sola línea recta (arriba-abajo, dos mitades) y 3 dibuja tres rayos a 120° (como un
// reloj a las 12, 4 y 8) -- elegible por gráfico, el texto de cada segmento sigue ubicándose
// según su propia cantidad real de segmentos, no según lineCount.
const DONUT_SPOKE_COLOR = 0x968c72
const DONUT_SPOKE_WIDTH = 2
// Largo de cada línea, medido desde el centro -- independiente de DONUT_OUTER_RADIUS (antes
// llegaban siempre hasta el borde de afuera de la dona). Subirlo las estira hacia el anillo,
// bajarlo las achica hacia el centro.
const DONUT_SPOKE_LENGTH = 90
// Distancia desde el centro a la que se ancla el bloque porcentaje+etiqueta de cada segmento.
const DONUT_TEXT_RADIUS = 36
// Empuje extra hacia abajo (px) para el bloque de texto que cae justo abajo del centro -- ver
// dónde se usa, en el map de Donut.
const BOTTOM_TEXT_Y_OFFSET = 10

// Glow del segmento activo (ver Donut.activeLabel) -- se redibuja SOLO ese arco encima del anillo
// normal con un GlowFilter (mismo tipo que LIVE_GLOW_FILTER en GameRow.tsx), sin cambiar el
// grosor de nada: todos los segmentos quedan igual, el activo simplemente brilla. Estático (sin
// pulso): distance alto + outerStrength bajo para que se vea difuminado y suave lejos de la
// línea, en vez de un halo intenso pegado justo al trazo.
const ACTIVE_GLOW_DISTANCE = 34
const ACTIVE_GLOW_OUTER_STRENGTH = 1.4
const ACTIVE_GLOW_QUALITY = 0.3
const ACTIVE_GLOW_ALPHA = 0.9
// Con un segmento activo, el resto del anillo baja a esta alpha -- así el contraste ayuda a que
// se note el que está prendido, no solo el glow que se le agrega encima.
const INACTIVE_SEGMENT_ALPHA = 0.3

// Sin panel de fondo detrás, el título/leyendas van directo sobre la foto (oscurecida, ver
// lobby-background-image) -- un dropShadow chico les da contraste en vez de perderse contra
// zonas claras de la foto, mismo criterio que COUNTDOWN_VALUE_STYLE_NORMAL en layout.constants.ts.
const LEGIBILITY_SHADOW = { alpha: 0.85, blur: 4, color: 0x000000, distance: 2 }

const TITLE_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 18,
  fill: 0xFFFFFF,
  letterSpacing: 1,
  dropShadow: LEGIBILITY_SHADOW,
})
// Porcentaje grande centrado en cada porción -- blanco siempre (no coloreado por segmento, ver
// referencia): el color de cada porción ya lo lleva el anillo y la etiqueta debajo.
const PERCENT_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 24,
  fill: 0xffffff,
  dropShadow: LEGIBILITY_SHADOW,
})

// Colores de los gráficos -- red/black/even/odd/high/low salen de spinStatsColors (compartidos
// con el highlight de la rueda, ver useCategoryHighlightEntries, para que ambos lados siempre
// coincidan). "black" es un gris claro, no el negro real (como en los círculos de
// NumberPanelHotCold): ahí funciona porque es un círculo sólido con su propio borde; acá es un
// anillo fino sin fondo detrás, y el negro real se perdería contra la foto oscurecida. Verde no es
// una categoría del ciclo (0/00 nunca se resalta), así que queda local a este gráfico.
const CHART_COLOR_HEX: Record<'red' | 'black' | 'green', number> = {
  red: RED_COLOR,
  black: BLACK_COLOR,
  green: 0x1f7a3d,
}

const titleAnchor = { x: 0.5, y: 0.5 }
const centerAnchor = { x: 0.5, y: 0.5 }

// Etiqueta (RED, BLACK, EVEN, ODD, ...) -- blanca siempre, igual que el porcentaje; el color de
// cada segmento ya lo lleva el anillo, no hace falta repetirlo en el texto.
const LABEL_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize: 14, fill: 0xffffff, dropShadow: LEGIBILITY_SHADOW })

interface DonutSegment {
  label: string
  value: number
  color: number
  // false = el segmento sigue contando para el anillo y para repartir las zonas de texto de los
  // demás (wedgeAngle sigue usando segments.length), pero no dibuja su propio porcentaje/etiqueta
  // -- pensado para "verde" en rojo/negro/verde, una porción muy chica que satura esa zona.
  // Default true.
  showText?: boolean
}

interface DonutBlock {
  segments: DonutSegment[]
  // 1 = una sola línea recta (dos mitades), 3 = tres rayos a 120° -- independiente de
  // segments.length, ver comentario de DONUT_SPOKE_COLOR.
  lineCount: 1 | 3
  // label del segmento a resaltar con glow (ej. "RED") -- undefined = ninguno brillando. Control
  // manual: quien arma `blocks` decide qué valor pasarle y cuándo cambiarlo (ver ACTIVE_GLOW_*).
  activeLabel?: string
}

function blockHeight(): number {
  return DONUT_OUTER_RADIUS * 2
}

// Anillo con segmentos proporcionales a `value/total` (arcos gruesos, como antes) más N líneas
// doradas en partes IGUALES (una por segmento, sin importar su proporción real) que dividen el
// centro en zonas de texto -- en cada zona va el porcentaje (grande, blanco) y la etiqueta
// (chica, coloreada como su segmento) del segmento correspondiente. El anillo sigue mostrando la
// proporción real; las líneas/zonas de texto son solo para poder leer cada número.
//
// `total` sale de sumar los propios segments, NO de sampleSize -- para color (rojo/negro/verde)
// da lo mismo, porque todo spin tiene color. Para par/impar, alto/bajo, docena y columna, en
// cambio, 0/00 no cuenta en ninguna de sus categorías, así que sampleSize sería mayor que la suma
// de segments y dejaría un hueco sin colorear en el anillo (el "track") representando esos
// spins -- usar la suma de los propios segments como denominador hace que esas donas siempre
// sumen 100% entre sus propias categorías, ignorando 0/00 por completo, como corresponde acá.
function Donut({
  x,
  y,
  segments,
  lineCount,
  activeLabel,
}: {
  x: number
  y: number
  segments: DonutSegment[]
  lineCount: 1 | 3
  activeLabel?: string
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)

  // Ángulo de inicio/barrido de cada segmento -- una sola fuente de verdad, la usan tanto el
  // anillo base (todos los segmentos) como el overlay de glow (solo el activo, ver más abajo) sin
  // recalcular dos veces lo mismo.
  const segmentAngles = useMemo(() => {
    let angle = -Math.PI / 2
    return segments.map((segment) => {
      const sweep = total > 0 ? (segment.value / total) * Math.PI * 2 : 0
      const entry = { segment, startAngle: angle, sweep }
      angle += sweep
      return entry
    })
  }, [segments, total])

  const activeEntry = activeLabel ? segmentAngles.find((entry) => entry.segment.label === activeLabel) : undefined

  const drawArcSegment = useCallback((g: PixiGraphics, startAngle: number, sweep: number, color: number, alpha = 1) => {
    const ringWidth = DONUT_RING_WIDTH
    const midRadius = DONUT_OUTER_RADIUS - ringWidth / 2
    g.setStrokeStyle({ width: ringWidth, color, alpha })
    // moveTo explícito al punto de inicio del arco -- sin esto, arc() (igual que en Canvas 2D)
    // traza una línea recta desde donde haya quedado el cursor del path anterior hasta el inicio
    // del arco, y esa línea también queda stroked con este mismo ringWidth -- se veía como una
    // barra saliendo del centro.
    g.moveTo(Math.cos(startAngle) * midRadius, Math.sin(startAngle) * midRadius)
    g.arc(0, 0, midRadius, startAngle, startAngle + sweep)
    g.stroke()
  }, [])

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      const ringWidth = DONUT_RING_WIDTH
      const midRadius = DONUT_OUTER_RADIUS - ringWidth / 2

      g.setStrokeStyle({ width: ringWidth, color: DONUT_TRACK_COLOR })
      g.circle(0, 0, midRadius)
      g.stroke()

      for (const entry of segmentAngles) {
        if (entry.sweep <= 0) continue
        // El anillo base SIEMPRE va a INACTIVE_SEGMENT_ALPHA, haya o no un segmento activo -- el
        // que está activo resalta solo por el overlay con glow (drawGlow, alpha 1 + GlowFilter),
        // no porque acá se le suba el alpha. Sin ningún activo, toda la dona queda pareja y tenue.
        drawArcSegment(g, entry.startAngle, entry.sweep, entry.segment.color, INACTIVE_SEGMENT_ALPHA)
      }

      // lineCount 1 = una sola línea recta de punta a punta (arriba-abajo, dos mitades) -- se
      // dibuja como UNA línea (no dos radios), para que no quede un vértice partido a la mitad.
      // lineCount 3 = tres rayos a 120° desde el centro.
      g.setStrokeStyle({ width: DONUT_SPOKE_WIDTH, color: DONUT_SPOKE_COLOR })
      if (lineCount === 1) {
        g.moveTo(0, -DONUT_SPOKE_LENGTH)
        g.lineTo(0, DONUT_SPOKE_LENGTH)
      } else {
        const spokeAngleStep = (Math.PI * 2) / lineCount
        for (let i = 0; i < lineCount; i++) {
          const lineAngle = -Math.PI / 2 + i * spokeAngleStep
          g.moveTo(0, 0)
          g.lineTo(Math.cos(lineAngle) * DONUT_SPOKE_LENGTH, Math.sin(lineAngle) * DONUT_SPOKE_LENGTH)
        }
      }
      g.stroke()
    },
    [segmentAngles, lineCount, drawArcSegment],
  )

  // Redibuja SOLO el segmento activo, encima del anillo -- mismo arco, mismo grosor, la única
  // diferencia es el GlowFilter aplicado acá (ver drawGlow más abajo). Sin esto no habría forma de
  // que solo uno de los N arcos de un único pixiGraphics brille: el filtro se aplica al nodo
  // entero, así que el segmento activo necesita su propio nodo separado.
  const drawGlow = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      if (!activeEntry || activeEntry.sweep <= 0) return
      drawArcSegment(g, activeEntry.startAngle, activeEntry.sweep, activeEntry.segment.color)
    },
    [activeEntry, drawArcSegment],
  )

  // Estático (sin pulso) -- distance grande y outerStrength bajo para que se vea difuminado y
  // suave lejos de la línea, en vez de un halo intenso pegado al trazo.
  const glowFilter = useMemo(
    () =>
      new GlowFilter({
        distance: ACTIVE_GLOW_DISTANCE,
        outerStrength: ACTIVE_GLOW_OUTER_STRENGTH,
        innerStrength: 0,
        color: activeEntry?.segment.color ?? 0xffffff,
        quality: ACTIVE_GLOW_QUALITY,
        alpha: ACTIVE_GLOW_ALPHA,
      }),
    [activeEntry?.segment.color],
  )

  // Las zonas de texto se reparten SOLO entre los segmentos con showText -- si a rojo/negro/verde
  // se le apaga el texto de verde, quedan 2 segmentos visibles y el texto se divide en 2 mitades
  // (igual que even/odd), no en 3 tercios con un hueco vacío en el medio.
  const visibleSegments = segments.filter((segment) => segment.showText !== false)
  const wedgeAngle = (Math.PI * 2) / visibleSegments.length

  return (
    <pixiContainer x={x} y={y}>
      <pixiGraphics draw={draw} />
      {activeEntry && <pixiGraphics draw={drawGlow} filters={[glowFilter]} />}
      {visibleSegments.map((segment, index) => {
        const bisector = -Math.PI / 2 + (index + 0.5) * wedgeAngle
        const textX = Math.cos(bisector) * DONUT_TEXT_RADIUS
        // El bisector que cae justo abajo (recto hacia abajo, sin(bisector) ~ 1) solo se da con 3
        // segmentos parejos (lineCount 3, fase 2 docenas/columnas -- con 2 segmentos los bisectores
        // caen a los costados, nunca abajo) -- ahí el texto queda muy pegado a donde convergen los
        // 3 rayos dorados, BOTTOM_TEXT_Y_OFFSET le da un poco más de aire hacia abajo.
        const textY = Math.sin(bisector) * DONUT_TEXT_RADIUS + (Math.sin(bisector) > 0.99 ? BOTTOM_TEXT_Y_OFFSET : 0)
        const percent = total > 0 ? Math.round((segment.value / total) * 100) : 0

        return (
          <pixiContainer key={segment.label}>
            <pixiText text={`${percent}%`} style={PERCENT_STYLE} x={textX} y={textY - 11} anchor={centerAnchor} />
            <pixiText text={segment.label} style={LABEL_STYLE} x={textX} y={textY + 14} anchor={centerAnchor} />
          </pixiContainer>
        )
      })}
    </pixiContainer>
  )
}

// Dona (porcentaje/etiqueta ya van adentro, ver Donut) -- una por gráfico, apiladas
// verticalmente por el padre. Sin caption arriba -- las etiquetas de cada porción (RED/BLACK,
// EVEN/ODD, etc.) ya dicen de qué gráfico se trata.
function StatDonutBlock({
  x,
  y,
  segments,
  lineCount,
  activeLabel,
}: {
  x: number
  y: number
  segments: DonutSegment[]
  lineCount: 1 | 3
  activeLabel?: string
}) {
  return <Donut x={x} y={y + DONUT_OUTER_RADIUS} segments={segments} lineCount={lineCount} activeLabel={activeLabel} />
}

export function SpinStatsPanel() {
  const { t } = useTranslation()
  const { visibleLeft, visibleTop } = useViewport()
  const rawResults = useResultsStore((state) => state.rawResults)

  // shouldShow/activeCategory/donutSet/maskCoverage vienen de useSpinStatsCycle -- fuente única
  // ligada al countdown real (baja 2s después de que Hot/Cold se oculta, se oculta a los 5s de
  // faltar para el próximo sorteo) y compartida con LobbyBackgroundLayer (NumberCellHighlightLayer
  // en fase 1, Dozen/ColumnDiamondIndicatorLayer en fase 2), para que la dona resaltada y lo que
  // se resalta en la rueda siempre coincidan.
  const { shouldShow, activeCategory, donutSet, maskCoverage } = useSpinStatsCycle()
  const progress = useAnimatedProgress(shouldShow ? 0 : 1, TRANSITION_DURATION_MS, { startAtTarget: true })
  // PANEL_EXIT_DISTANCE propio (no el SIDE_EXIT_DISTANCE compartido de 550) -- el contenido de
  // este panel (título + 3 donas apiladas, ~750px de alto) es más alto que el resto de los
  // paneles que usan ese valor, así que 550 no alcanzaba para sacarlo completo de pantalla.
  const exitOffset = easeInOutCubic(progress) * PANEL_EXIT_DISTANCE

  const panelX = visibleLeft + LAYOUT.padding
  const panelY = visibleTop + LAYOUT.padding - exitOffset

  const stats = useMemo(() => computeSpinStats(rawResults, LAST_SPINS_LIMIT), [rawResults])

  const phase1Blocks: DonutBlock[] = useMemo(
    () => [
      {
        lineCount: 1,
        // activeLabel sale del ciclo real (ver useSpinStatsCycle) -- undefined cuando la
        // categoría activa no es de este gráfico (o no hay ninguna), y ahí Donut ya deja TODOS
        // los segmentos en INACTIVE_SEGMENT_ALPHA sin necesidad de nada más acá.
        activeLabel: activeCategory === 'red' ? t('spinStats.red') : activeCategory === 'black' ? t('spinStats.black') : undefined,
        segments: [
          { label: t('spinStats.red'), value: stats.color.red, color: CHART_COLOR_HEX.red },
          { label: t('spinStats.black'), value: stats.color.black, color: CHART_COLOR_HEX.black },
          { label: t('spinStats.green'), value: stats.color.green, color: CHART_COLOR_HEX.green, showText: false },
        ],
      },
      {
        lineCount: 1,
        activeLabel: activeCategory === 'even' ? t('spinStats.even') : activeCategory === 'odd' ? t('spinStats.odd') : undefined,
        segments: [
          { label: t('spinStats.even'), value: stats.evenOdd.even, color: EVEN_COLOR },
          { label: t('spinStats.odd'), value: stats.evenOdd.odd, color: ODD_COLOR },
        ],
      },
      {
        lineCount: 1,
        activeLabel: activeCategory === 'low' ? t('spinStats.low') : activeCategory === 'high' ? t('spinStats.high') : undefined,
        segments: [
          { label: t('spinStats.low'), value: stats.highLow.low, color: LOW_COLOR },
          { label: t('spinStats.high'), value: stats.highLow.high, color: HIGH_COLOR },
        ],
      },
    ],
    [stats, t, activeCategory],
  )

  // Fase 2: docenas y columnas, 3 segmentos cada una (lineCount 3 -- tres rayos a 120°, ver
  // comentario de DONUT_SPOKE_COLOR). Mismo trío de colores para ambas (ver FIRST/SECOND/THIRD_
  // GROUP_COLOR en spinStatsColors.ts), compartido con los diamantes de la rueda (ver
  // dozenDiamondIndicatorStyles.ts / columnDiamondIndicatorStyles.ts). Las etiquetas de docena son
  // rangos numéricos directos (no hay nada que traducir, a diferencia de columna).
  const phase2Blocks: DonutBlock[] = useMemo(
    () => [
      {
        lineCount: 3,
        activeLabel:
          activeCategory === 'firstDozen'
            ? '1-12'
            : activeCategory === 'secondDozen'
              ? '13-24'
              : activeCategory === 'thirdDozen'
                ? '25-36'
                : undefined,
        segments: [
          { label: '1-12', value: stats.dozen.firstDozen, color: FIRST_GROUP_COLOR },
          { label: '13-24', value: stats.dozen.secondDozen, color: SECOND_GROUP_COLOR },
          { label: '25-36', value: stats.dozen.thirdDozen, color: THIRD_GROUP_COLOR },
        ],
      },
      {
        lineCount: 3,
        activeLabel:
          activeCategory === 'firstColumn'
            ? t('spinStats.firstColumn')
            : activeCategory === 'secondColumn'
              ? t('spinStats.secondColumn')
              : activeCategory === 'thirdColumn'
                ? t('spinStats.thirdColumn')
                : undefined,
        segments: [
          { label: t('spinStats.firstColumn'), value: stats.column.firstColumn, color: FIRST_GROUP_COLOR },
          { label: t('spinStats.secondColumn'), value: stats.column.secondColumn, color: SECOND_GROUP_COLOR },
          { label: t('spinStats.thirdColumn'), value: stats.column.thirdColumn, color: THIRD_GROUP_COLOR },
        ],
      },
    ],
    [stats, t, activeCategory],
  )

  const blocks = donutSet === 'phase1' ? phase1Blocks : phase2Blocks

  // Máscara que tapa/revela las donas entre fase 1 y fase 2 -- un simple rectángulo ancho de sobra
  // (CONTENT_WIDTH) cuyo alto baja de PHASE_MASK_CONTENT_HEIGHT a 0 a medida que maskCoverage sube
  // de 0 a 1 (y viceversa). y=0 siempre fijo (arriba): con maskCoverage subiendo, el borde de ABAJO
  // del rectángulo visible sube -- se ve como si la máscara tapara de abajo hacia arriba. Con
  // maskCoverage bajando de 1 a 0 (fase entrante), ese mismo borde baja -- se ve como si revelara
  // de arriba hacia abajo. Un solo rectángulo, la dirección la da si maskCoverage sube o baja (ver
  // useSpinStatsCycle). Sin renderable={false} a propósito -- Pixi ya deja de dibujar como hijo
  // normal a cualquier objeto que esté asignado como `mask` de otro (se ve solo como máscara, no
  // como rectángulo blanco encima); renderable={false} ACÁ rompe la máscara entera (queda con
  // geometría vacía, tapando TODO sin importar maskCoverage) -- probado, no es solo teoría.
  const [maskGraphics, setMaskGraphics] = useState<PixiGraphics | null>(null)
  const drawMask = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      const visibleHeight = Math.max(0, PHASE_MASK_CONTENT_HEIGHT * (1 - maskCoverage))
      if (visibleHeight <= 0) return
      g.rect(0, 0, CONTENT_WIDTH, visibleHeight)
      g.fill(0xffffff)
    },
    [maskCoverage],
  )

  return (
    <pixiContainer x={panelX} y={panelY}>
      <pixiText text={t('spinStats.title', { count: LAST_SPINS_LIMIT })} style={TITLE_STYLE} x={CONTENT_WIDTH / 2} y={TITLE_HEIGHT / 2} anchor={titleAnchor} />

      <pixiGraphics ref={setMaskGraphics} draw={drawMask} />
      <pixiContainer x={0} y={TITLE_HEIGHT + TITLE_GAP} mask={maskGraphics ?? undefined}>
        {(() => {
          let cursorY = 0
          return blocks.map((block, index) => {
            const y = cursorY
            cursorY += blockHeight() + BLOCK_GAP
            return (
              <StatDonutBlock
                key={`${donutSet}-${index}`}
                x={CONTENT_WIDTH / 2}
                y={y}
                segments={block.segments}
                lineCount={block.lineCount}
                activeLabel={block.activeLabel}
              />
            )
          })
        })()}
      </pixiContainer>
    </pixiContainer>
  )
}
