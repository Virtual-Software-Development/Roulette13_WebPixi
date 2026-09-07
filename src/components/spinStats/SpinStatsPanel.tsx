import { useCallback, useEffect, useMemo, useState } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { GlowFilter } from 'pixi-filters'
import { useTranslation } from 'react-i18next'
import { useResultsStore } from '../../store/useResultsStore'
import { useSpinStatsCycle } from '../../hooks/useSpinStatsCycle'
import type { SpinStatsDonutSet } from '../../hooks/useSpinStatsCycle'
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

// Cuánto tarda la transición de ocultar/revelar entre fase 1 y fase 2 -- se anima acá, con
// useAnimatedProgress (tick real de Pixi), no con el valor crudo de useSpinStatsCycle (que solo
// cambia una vez por segundo real, insuficiente para animar esto sin que se vea a los saltos).
const DONUT_TRANSITION_DURATION_MS = 320

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

// Animación de ocultar/revelar entre fase 1 y fase 2 (ver Donut.transitionProgress, viene de
// useSpinStatsCycle) -- sin máscara: cada elemento anima su propia salida. El porcentaje baja,
// la etiqueta sube, ambos se difuminan a la vez -- se separan en vez de moverse juntos para que
// el ojo note el movimiento, no solo el fundido.
const PERCENT_EXIT_Y_OFFSET = 14
const LABEL_EXIT_Y_OFFSET = 14

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

// Encoge un segmento de línea (de `from` a `to`) hacia su propio punto medio a medida que
// `progress` sube de 0 a 1 -- a progress=1 ambos extremos coinciden en el punto medio (largo 0,
// invisible). Usado tanto para la línea única de lineCount 1 (su punto medio es el centro de la
// dona, así que se encoge simétrico hacia el centro) como para cada rayo de lineCount 3 (su punto
// medio cae a mitad de camino hacia afuera, así que se encoge hacia ESE punto, no hacia el centro).
function shrinkLineTowardMidpoint(fromX: number, fromY: number, toX: number, toY: number, progress: number) {
  const midX = (fromX + toX) / 2
  const midY = (fromY + toY) / 2
  const keep = 1 - progress
  return {
    fromX: midX + (fromX - midX) * keep,
    fromY: midY + (fromY - midY) * keep,
    toX: midX + (toX - midX) * keep,
    toY: midY + (toY - midY) * keep,
  }
}

// Achica un arco (segmento del anillo) desde AMBOS extremos hacia su ángulo medio a medida que
// `progress` sube de 0 a 1 -- el ángulo medio queda fijo (se calcula sobre el sweep ORIGINAL, no
// el que se va reduciendo), así el arco se va comiendo simétricamente desde las dos puntas hasta
// desaparecer del todo en progress=1, en vez de deslizarse hacia un lado.
function shrinkArcTowardMidAngle(startAngle: number, sweep: number, progress: number) {
  const midAngle = startAngle + sweep / 2
  const newSweep = sweep * (1 - progress)
  return { startAngle: midAngle - newSweep / 2, sweep: newSweep }
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
  transitionProgress,
}: {
  x: number
  y: number
  segments: DonutSegment[]
  lineCount: 1 | 3
  activeLabel?: string
  // 0 = dona en reposo, totalmente visible. Sube a 1 mientras se oculta (ver useSpinStatsCycle) y
  // baja de 1 a 0 mientras el set entrante se revela -- maneja las tres animaciones de acá abajo
  // (arcos, líneas, texto), no un mask.
  transitionProgress: number
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
        // Se achica desde ambos extremos hacia su ángulo medio a medida que transitionProgress
        // sube -- ver shrinkArcTowardMidAngle. El anillo base SIEMPRE va a INACTIVE_SEGMENT_ALPHA,
        // haya o no un segmento activo -- el que está activo resalta solo por el overlay con glow
        // (drawGlow, alpha 1 + GlowFilter), no porque acá se le suba el alpha. Sin ningún activo,
        // toda la dona queda pareja y tenue.
        const arc = shrinkArcTowardMidAngle(entry.startAngle, entry.sweep, transitionProgress)
        if (arc.sweep <= 0) continue
        drawArcSegment(g, arc.startAngle, arc.sweep, entry.segment.color, INACTIVE_SEGMENT_ALPHA)
      }

      // lineCount 1 = una sola línea recta de punta a punta (arriba-abajo, dos mitades) -- se
      // dibuja como UNA línea (no dos radios), para que no quede un vértice partido a la mitad.
      // lineCount 3 = tres rayos a 120° desde el centro. Cada línea se encoge hacia su propio
      // punto medio a medida que transitionProgress sube -- ver shrinkLineTowardMidpoint.
      g.setStrokeStyle({ width: DONUT_SPOKE_WIDTH, color: DONUT_SPOKE_COLOR })
      if (lineCount === 1) {
        const line = shrinkLineTowardMidpoint(0, -DONUT_SPOKE_LENGTH, 0, DONUT_SPOKE_LENGTH, transitionProgress)
        g.moveTo(line.fromX, line.fromY)
        g.lineTo(line.toX, line.toY)
      } else {
        const spokeAngleStep = (Math.PI * 2) / lineCount
        for (let i = 0; i < lineCount; i++) {
          const lineAngle = -Math.PI / 2 + i * spokeAngleStep
          const line = shrinkLineTowardMidpoint(0, 0, Math.cos(lineAngle) * DONUT_SPOKE_LENGTH, Math.sin(lineAngle) * DONUT_SPOKE_LENGTH, transitionProgress)
          g.moveTo(line.fromX, line.fromY)
          g.lineTo(line.toX, line.toY)
        }
      }
      g.stroke()
    },
    [segmentAngles, lineCount, drawArcSegment, transitionProgress],
  )

  // Redibuja SOLO el segmento activo, encima del anillo -- mismo arco, mismo grosor, la única
  // diferencia es el GlowFilter aplicado acá (ver drawGlow más abajo). Sin esto no habría forma de
  // que solo uno de los N arcos de un único pixiGraphics brille: el filtro se aplica al nodo
  // entero, así que el segmento activo necesita su propio nodo separado.
  const drawGlow = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      if (!activeEntry || activeEntry.sweep <= 0) return
      const arc = shrinkArcTowardMidAngle(activeEntry.startAngle, activeEntry.sweep, transitionProgress)
      if (arc.sweep <= 0) return
      drawArcSegment(g, arc.startAngle, arc.sweep, activeEntry.segment.color)
    },
    [activeEntry, drawArcSegment, transitionProgress],
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
        // Al ocultarse (transitionProgress 0->1): el porcentaje baja, la etiqueta sube, ambos se
        // difuminan a la vez -- ver PERCENT_EXIT_Y_OFFSET/LABEL_EXIT_Y_OFFSET. Al revelarse
        // (1->0) es la misma animación en reversa, sin lógica aparte.
        const textAlpha = 1 - transitionProgress

        return (
          <pixiContainer key={segment.label}>
            <pixiText
              text={`${percent}%`}
              style={PERCENT_STYLE}
              x={textX}
              y={textY - 11 + transitionProgress * PERCENT_EXIT_Y_OFFSET}
              anchor={centerAnchor}
              alpha={textAlpha}
            />
            <pixiText
              text={segment.label}
              style={LABEL_STYLE}
              x={textX}
              y={textY + 14 - transitionProgress * LABEL_EXIT_Y_OFFSET}
              anchor={centerAnchor}
              alpha={textAlpha}
            />
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
  transitionProgress,
}: {
  x: number
  y: number
  segments: DonutSegment[]
  lineCount: 1 | 3
  activeLabel?: string
  transitionProgress: number
}) {
  return (
    <Donut x={x} y={y + DONUT_OUTER_RADIUS} segments={segments} lineCount={lineCount} activeLabel={activeLabel} transitionProgress={transitionProgress} />
  )
}

export function SpinStatsPanel() {
  const { t } = useTranslation()
  const { visibleLeft, visibleTop } = useViewport()
  const rawResults = useResultsStore((state) => state.rawResults)

  // shouldShow/activeCategory/donutSet vienen de useSpinStatsCycle -- fuente única ligada al
  // countdown real (baja 2s después de que Hot/Cold se oculta, se oculta a los 5s de faltar para
  // el próximo sorteo) y compartida con LobbyBackgroundLayer (NumberCellHighlightLayer en fase 1,
  // Dozen/ColumnDiamondIndicatorLayer en fase 2), para que la dona resaltada y lo que se resalta
  // en la rueda siempre coincidan.
  const { shouldShow, activeCategory, donutSet } = useSpinStatsCycle()
  const progress = useAnimatedProgress(shouldShow ? 0 : 1, TRANSITION_DURATION_MS, { startAtTarget: true })

  // Qué set se está dibujando AHORA -- distinto de `donutSet` (la fuente de verdad de
  // useSpinStatsCycle) mientras dura la animación de transición: `donutSet` es la señal de "hay
  // que cambiar", `renderedDonutSet` es lo que de verdad se monta, y solo se actualiza cuando la
  // salida del set viejo terminó de animarse (ver los dos efectos de abajo).
  const [renderedDonutSet, setRenderedDonutSet] = useState<SpinStatsDonutSet>(donutSet)
  // 0 = renderedDonutSet visible en reposo. 1 = ocultándose/oculto. hideProgress corre con un tick
  // real de Pixi por frame (useAnimatedProgress), NO con donutSet -- ese valor solo cambia una vez
  // por segundo real (ver useSpinStatsCycle), insuficiente para animar algo de ~0.5s sin que se
  // vea a los saltos.
  const [hideTarget, setHideTarget] = useState<0 | 1>(0)
  const hideProgress = useAnimatedProgress(hideTarget, DONUT_TRANSITION_DURATION_MS, { startAtTarget: true })

  // donutSet cambió respecto de lo que se está dibujando -- arranca a ocultarse el set viejo.
  useEffect(() => {
    if (donutSet !== renderedDonutSet) {
      setHideTarget(1)
    }
  }, [donutSet, renderedDonutSet])

  // El set viejo ya terminó de ocultarse del todo -- recién ahí se cambia al nuevo y arranca a
  // revelarse (misma animación, en reversa). Nunca se solapan.
  useEffect(() => {
    if (hideTarget === 1 && hideProgress >= 1) {
      setRenderedDonutSet(donutSet)
      setHideTarget(0)
    }
  }, [hideTarget, hideProgress, donutSet])
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

  const blocks = renderedDonutSet === 'phase1' ? phase1Blocks : phase2Blocks

  return (
    <pixiContainer x={panelX} y={panelY}>
      <pixiText text={t('spinStats.title', { count: LAST_SPINS_LIMIT })} style={TITLE_STYLE} x={CONTENT_WIDTH / 2} y={TITLE_HEIGHT / 2} anchor={titleAnchor} />

      <pixiContainer x={0} y={TITLE_HEIGHT + TITLE_GAP}>
        {(() => {
          let cursorY = 0
          return blocks.map((block, index) => {
            const y = cursorY
            cursorY += blockHeight() + BLOCK_GAP
            return (
              <StatDonutBlock
                key={`${renderedDonutSet}-${index}`}
                x={CONTENT_WIDTH / 2}
                y={y}
                segments={block.segments}
                lineCount={block.lineCount}
                activeLabel={block.activeLabel}
                transitionProgress={hideProgress}
              />
            )
          })
        })()}
      </pixiContainer>
    </pixiContainer>
  )
}
