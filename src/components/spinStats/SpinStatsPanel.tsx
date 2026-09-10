import { useCallback, useEffect, useMemo, useState } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { GlowFilter } from 'pixi-filters'
import { useTranslation } from 'react-i18next'
import { useResultsStore } from '../../store/useResultsStore'
import { useSpinStatsCycle } from '../../hooks/useSpinStatsCycle'
import type { SpinStatsCategory, SpinStatsDonutSet } from '../../hooks/useSpinStatsCycle'
import { useViewport } from '../../hooks/useViewport'
import { useAnimatedProgress } from '../../hooks/useAnimatedProgress'
import { easeInOutCubic } from '../../utils/easing'
import { computeSpinStats } from '../../utils/spinStats'
import { RED_COLOR, EVEN_COLOR, ODD_COLOR, HIGH_COLOR, LOW_COLOR, FIRST_GROUP_COLOR, SECOND_GROUP_COLOR, THIRD_GROUP_COLOR } from '../../utils/spinStatsColors'
import { LAYOUT, TRANSITION_DURATION_MS } from '../../layout/layout.constants'
import { drawRoundedPanel } from '../../utils/roundedPanel'
import { InfoIcon } from '../common/InfoIcon'

extend({ Container, Graphics, Text })

// -----------------------------------------------------------------------------------------------
// Panel de estadísticas: reemplaza el diseño temporal anterior (donas flotando directo sobre la
// foto de fondo, sin panel/borde/header propios) por una tarjeta cerrada -- mismo lenguaje visual
// que NumberPanelHotCold (incluso reutiliza su InfoIcon), en el mismo slot de pantalla. TODA la
// máquina de estados existente se conserva sin tocar: useSpinStatsCycle (shouldShow/
// activeCategory/donutSet, con el mismo timing/countdown real, incluido el nuevo delay de 0.5s
// tras HotCold -- ver useSpinStatsCycle.ts), el cross-fade fase1<->fase2 (renderedDonutSet/
// hideTarget/hideProgress) y computeSpinStats (misma semántica de 0/00, misma normalización por
// categoría). Lo único que cambia es CÓMO se dibuja cada dona:
//   - Fase 1 (color/even-odd/high-low): ahora son AccentStatRow -- un anillo binario (+ una cuña
//     verde chica en color) con el lado accent (rojo/azul/teal) siempre RELLENO de su color y el
//     otro siempre en el mismo gris cálido neutral, pero el GLOW (borde brillante + GlowFilter)
//     solo prende sobre el lado que matchea activeCategory en este instante -- igual criterio que
//     fase 2 (glow-solo-en-el-activo), pedido explícito para que las 3 filas resalten en sincro
//     con el mismo ciclo que ya resalta la rueda. percent/label van AFUERA del anillo (columnas
//     izquierda/derecha), ícono central en un medallón.
//   - Fase 2 (docenas/columnas): sigue siendo Donut/StatDonutBlock (mismo activeLabel, mismo
//     glow-solo-en-el-activo, mismo texto radial adentro del anillo -- 3 categorías igual de
//     reales, no hay un lado "neutral" que journalize a gris como en fase 1) -- solo se le
//     actualiza el look del anillo (radio/grosor/outline/gris cálido) para que la familia visual
//     sea consistente con fase 1, sin tocar su lógica.
// activeCategory sigue siendo consumido (fase 2) y sigue siendo la MISMA fuente que
// useCategoryHighlightEntries/useDozenColumnHighlightEntries usan para resaltar la rueda -- no se
// tocó useSpinStatsCycle más que el fix de timing ya mencionado.
// -----------------------------------------------------------------------------------------------

const LAST_SPINS_LIMIT = 100

// Antes 340 -- ensanchado a pedido explícito para que las donas (DONUT_OUTER_RADIUS más abajo)
// puedan crecer también: LEFT_COLUMN_X/RIGHT_COLUMN_X quedan fijos a 58px del borde, así que un
// panel más ancho por sí solo ya empuja el centro (CENTER_COLUMN_X = PANEL_WIDTH/2) más lejos de
// esas columnas de texto, dejando lugar de sobra para agrandar el anillo sin que quede pegado al
// percent/label.
const PANEL_WIDTH = 380
const PANEL_PADDING = 22
const PANEL_CORNER_RADIUS = 14
const PANEL_BG = 0x040f1a
const PANEL_BORDER_COLOR = 0x4b5866
const PANEL_BORDER_ALPHA = 0.55
const PANEL_BORDER_WIDTH = 1.3

const HEADER_HEIGHT = 24
const HEADER_TO_SEPARATOR_GAP = 14
const SEPARATOR_COLOR = 0x17212a
const SEPARATOR_TO_SECTION_GAP = 18
// Antes 170 -- subido para que el panel completo (3 secciones + footer) alcance la misma altura
// visual que el panel de historial (LastGame + GameList) y que NumberPanelHotCold, pedido
// explícito de que los tres paneles se sientan del mismo tamaño en pantalla. El donut de cada
// sección queda centrado igual (donutCenterY = y + SECTION_HEIGHT/2), solo gana aire arriba/abajo.
const SECTION_HEIGHT = 216
const SECTION_TO_SEPARATOR_GAP = 14
const FOOTER_GAP = 16
const FOOTER_HEIGHT = 20
const BOTTOM_PADDING = 20

// Misma grilla de columnas para las 3 filas -- percent/label izquierda, dona centrada, percent/
// label derecha, todas comparten estos 3 ejes X (ver Section 27 del brief original). Separadas de
// DONUT_OUTER_RADIUS por suficiente aire (ver más abajo) para que el percent grande no quede
// pegado/solapado con el borde del anillo.
const LEFT_COLUMN_X = 58
const CENTER_COLUMN_X = PANEL_WIDTH / 2
const RIGHT_COLUMN_X = PANEL_WIDTH - 58

// Geometría del anillo -- compartida por las donas de fase 1 (AccentStatRow) y fase 2
// (Donut/StatDonutBlock), así los 5 gráficos se sienten la misma familia visual. Antes 60 (bajado
// de 70 porque los textos laterales quedaban demasiado cerca del anillo en el panel angosto de
// 340px) -- ahora que PANEL_WIDTH subió a 380, vuelve a subir a 70 (mismo ~20px de aire libre
// entre el borde del percent/label y el borde del anillo, solo que ahora con más panel alrededor).
const DONUT_OUTER_RADIUS = 70
const DONUT_RING_WIDTH = 15
const DONUT_OUTLINE_COLOR = 0x74726d
const DONUT_OUTLINE_ALPHA = 0.55
const DONUT_CENTER_DIVIDER_COLOR = 0x282628

// Antes 21 -- escalado junto con DONUT_OUTER_RADIUS (misma proporción ~0.35) para que el medallón
// central no quede chico frente al anillo ya agrandado.
const MEDALLION_RADIUS = 24
const MEDALLION_BG = 0x050b11
const MEDALLION_OUTER_STROKE = 0x686662
const MEDALLION_INNER_STROKE = 0x252b30
const ICON_COLOR = 0xaba6a0

// Lado neutral (BLACK/ODD/LOW) -- mismo gris cálido para las 3 filas, nunca el color semántico de
// esas categorías (ver SPIN_STATS_CATEGORY_COLOR): acá representan "el otro lado del binario", no
// necesitan distinguirse entre sí.
const NEUTRAL_ARC_COLOR = 0x1b1b1b
const GREEN_COLOR = 0x1f7a3d

// "Bright edge" del segmento ACTIVO -- una franja fina y más clara pegada al borde exterior del
// arco (ver drawActiveEdge), igual en espíritu al glow de fase 2 (Donut más abajo): solo brilla la
// categoría que useSpinStatsCycle está resaltando en este instante (activeCategory), no todo el
// tiempo. RED/EVEN/HIGH_BRIGHT son el tono cuando el lado ACENTO (izquierda) es el activo.
// NEUTRAL_BRIGHT sigue siendo el tono para BLACK (lado derecho de la fila RED/BLACK, que se
// mantiene gris neutro a propósito). ODD/LOW_BRIGHT son los nuevos tonos para el lado derecho de
// EVEN/ODD y HIGH/LOW -- antes esos dos lados también cayían en NEUTRAL_ARC_COLOR/NEUTRAL_BRIGHT
// (gris liso, "apagado" y sin relación con el color de su contraparte); ahora cada uno tiene su
// propio color de anillo + glow (rightColor/rightBright en AccentStatRow), elegido para combinar
// con el acento de su fila: ODD (ámbar) con EVEN (azul), LOW (violeta) con HIGH (turquesa).
// Deliberadamente distintos de RED_COLOR/EVEN_COLOR/HIGH_COLOR/ODD_COLOR/LOW_COLOR
// (utils/spinStatsColors.ts): esos son compartidos con el highlight de la rueda y no deben tocarse
// por un capricho visual de este panel.
const RED_BRIGHT = 0xff3b35
const EVEN_BRIGHT = 0x43b2ff
const ODD_BRIGHT = 0xffce7a
const HIGH_BRIGHT = 0x26ddd9
const LOW_BRIGHT = 0xd9a6ff
const NEUTRAL_BRIGHT = 0xe8e8ec

// Cuánto sube el panel al ocultarse -- deliberadamente más grande que el SIDE_EXIT_DISTANCE (550)
// que comparten Header/Footer/NumberPanelHotCold: el contenido de acá sigue siendo más alto que
// esos paneles, así que 550 dejaba el borde de abajo todavía visible en pantalla incluso con la
// animación de salida completa. Antes 850 -- alcanzaba mientras panelHeight rondaba los 722, pero
// tras subir SECTION_HEIGHT (panelHeight ahora ~860, ver ese comentario) volvía a quedar corto: se
// necesita al menos panelHeight + LAYOUT.padding (~890) para que el borde de abajo termine de
// cruzar visibleTop y el panel quede 100% fuera de pantalla, no solo "casi".
const PANEL_EXIT_DISTANCE = 1150

// Cuánto tarda la transición de ocultar/revelar entre fase 1 y fase 2 -- se anima acá, con
// useAnimatedProgress (tick real de Pixi), no con el valor crudo de useSpinStatsCycle (que solo
// cambia una vez por segundo real, insuficiente para animar esto sin que se vea a los saltos).
const DONUT_TRANSITION_DURATION_MS = 320

const HEADER_TITLE_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 20, letterSpacing: 0.4, fill: 0xc8c5c1 })

// Un TextStyle por acento, creado una sola vez a nivel módulo (nunca dentro de un render/loop, ver
// sección de performance del brief) -- el percent/label del lado IZQUIERDO de cada fila lleva el
// color de acento de esa fila. El lado derecho de RED/BLACK sigue siendo el neutral genérico
// (NEUTRAL_PERCENT_STYLE/NEUTRAL_LABEL_STYLE); ODD y LOW ahora tienen el suyo propio (ver
// rightPercentStyle/rightLabelStyle en AccentStatRow), en vez de compartir ese mismo neutral.
const RED_PERCENT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize: 32, fill: RED_COLOR })
const EVEN_PERCENT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize: 32, fill: EVEN_COLOR })
const ODD_PERCENT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize: 32, fill: ODD_COLOR })
const HIGH_PERCENT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize: 32, fill: HIGH_COLOR })
const LOW_PERCENT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize: 32, fill: LOW_COLOR })
const RED_LABEL_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 15, letterSpacing: 0.4, fill: RED_COLOR })
const EVEN_LABEL_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 15, letterSpacing: 0.4, fill: EVEN_COLOR })
const ODD_LABEL_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 15, letterSpacing: 0.4, fill: ODD_COLOR })
const HIGH_LABEL_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 15, letterSpacing: 0.4, fill: HIGH_COLOR })
const LOW_LABEL_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 15, letterSpacing: 0.4, fill: LOW_COLOR })

const NEUTRAL_PERCENT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize: 32, fill: 0xd7d4d0 })
const NEUTRAL_LABEL_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 15, letterSpacing: 0.4, fill: 0xc4c0bd })
const RANGE_STYLE = new TextStyle({ fontFamily: 'Arial', fontSize: 12, fill: 0xa4a19e })

const FOOTER_TEXT_STYLE = new TextStyle({ fontFamily: 'Arial', fontSize: 13, fill: 0xaaa6a2 })

// Texto radial DENTRO del anillo -- solo lo usa fase 2 (docenas/columnas, ver Donut más abajo).
// Tamaños reescalados junto con el anillo (antes vivían en un donut de radio 110, ahora 70).
// Un TextStyle por posición (no uniforme), igual criterio que fase 1: el percent/label de cada
// segmento lleva SU propio color. Antes el 2º y 3er sector compartían un mismo mauve-gris apagado
// (0xc9a8ba) que no se notaba como "su color" -- ahora cada uno usa un tono dentro de SU propio hue
// (blush para el 2º, ciruela/orquídea para el 3º), igual de reconocible que el rosa del 1º.
// Estáticos a nivel módulo (nunca por render/loop). Un array por índice, no un Record por color,
// porque dozen/column siempre arman sus segments en el mismo orden fijo [first, second, third] --
// ver también DOZEN_COLUMN_DONUT_STYLE más abajo.
const PHASE2_PERCENT_STYLES = [
  new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize: 25, fill: 0xff5fa8 }),
  new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize: 22, fill: 0xf7dbe6 }),
  new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize: 22, fill: 0xd98ab5 }),
]
const PHASE2_LABEL_STYLES = [
  new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize: 11, letterSpacing: 1, fill: 0xff6fb0 }),
  new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize: 10, letterSpacing: 1, fill: 0xeec2d6 }),
  new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize: 10, letterSpacing: 1, fill: 0xd98ab5 }),
]

const titleAnchor = { x: 0, y: 0.5 }

// -----------------------------------------------------------------------------------------------
// Íconos centrales -- line icons finos dibujados con Graphics (nunca emoji/unicode, mismo criterio
// que NumberPanelHotCold). RouletteIcon reutiliza el mismo lenguaje visual que el ícono central de
// RouletteCountdownIndicator (círculo + hub + rayos), solo que acá siempre estático y gris cálido.
// -----------------------------------------------------------------------------------------------

const ROULETTE_ICON_SPOKE_COUNT = 8

function RouletteIcon({ size = 26, color = ICON_COLOR }: { size?: number; color?: number }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      const outerRadius = size * 0.42
      const hubRadius = size * 0.14
      const strokeWidth = Math.max(1, size * 0.06)

      g.circle(0, 0, outerRadius)
      g.stroke({ width: strokeWidth, color })
      g.circle(0, 0, hubRadius)
      g.stroke({ width: strokeWidth, color })

      for (let i = 0; i < ROULETTE_ICON_SPOKE_COUNT; i++) {
        const angle = (i / ROULETTE_ICON_SPOKE_COUNT) * Math.PI * 2
        g.moveTo(hubRadius * Math.cos(angle), hubRadius * Math.sin(angle))
        g.lineTo(outerRadius * Math.cos(angle), outerRadius * Math.sin(angle))
        g.stroke({ width: strokeWidth, color })
      }
    },
    [size, color],
  )
  return <pixiGraphics draw={draw} />
}

// Balanza de la justicia -- pictograma simplificado (fiel/vasos/base), no un ícono detallado.
function ScalesIcon({ size = 26, color = ICON_COLOR }: { size?: number; color?: number }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      const half = size / 2
      const strokeWidth = Math.max(1, size * 0.055)
      g.setStrokeStyle({ width: strokeWidth, color })

      // fiel (poste vertical) + base
      g.moveTo(0, -half * 0.82)
      g.lineTo(0, half * 0.55)
      g.moveTo(-half * 0.38, half * 0.55)
      g.lineTo(half * 0.38, half * 0.55)

      // barra horizontal
      g.moveTo(-half * 0.78, -half * 0.62)
      g.lineTo(half * 0.78, -half * 0.62)

      // cadenas + platillos (arco abierto hacia abajo)
      for (const side of [-1, 1]) {
        const armX = half * 0.78 * side
        const panY = half * 0.05
        g.moveTo(armX, -half * 0.62)
        g.lineTo(armX, panY)
        g.arc(armX, panY, half * 0.28, 0, Math.PI)
      }

      g.stroke()
    },
    [size, color],
  )
  return <pixiGraphics draw={draw} />
}

// Barras ascendentes (4, de menor a mayor) -- a diferencia de StatsBarsIcon (GameList.tsx, alturas
// decorativas sin orden), acá el orden estrictamente creciente es el punto del ícono.
function BarsIcon({ size = 26, color = ICON_COLOR }: { size?: number; color?: number }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      const heights = [0.28, 0.48, 0.68, 0.9].map((ratio) => ratio * size)
      const barWidth = size * 0.14
      const gap = size * 0.08
      const totalWidth = heights.length * barWidth + (heights.length - 1) * gap
      const startX = -totalWidth / 2
      const baseY = size / 2
      heights.forEach((h, i) => {
        const x = startX + i * (barWidth + gap)
        g.rect(x, baseY - h, barWidth, h)
        g.fill(color)
      })
    },
    [size, color],
  )
  return <pixiGraphics draw={draw} />
}

function CenterIcon({ type, alpha = 1 }: { type: 'roulette' | 'scales' | 'bars'; alpha?: number }) {
  const size = MEDALLION_RADIUS * 1.3
  return (
    <pixiContainer alpha={alpha}>
      {type === 'roulette' && <RouletteIcon size={size} />}
      {type === 'scales' && <ScalesIcon size={size} />}
      {type === 'bars' && <BarsIcon size={size} />}
    </pixiContainer>
  )
}

// Medallón circular en el centro de cada dona -- fondo oscuro + doble stroke (outer/inner), separado
// del anillo principal por un espacio generoso (ver MEDALLION_RADIUS vs DONUT_OUTER_RADIUS -
// DONUT_RING_WIDTH). No toca el anillo.
function Medallion({ alpha = 1 }: { alpha?: number }) {
  const draw = useCallback((g: PixiGraphics) => {
    g.clear()
    g.circle(0, 0, MEDALLION_RADIUS)
    g.fill(MEDALLION_BG)
    g.stroke({ width: 1.2, color: MEDALLION_OUTER_STROKE, alpha: 0.8 })
    g.circle(0, 0, MEDALLION_RADIUS - 5)
    g.stroke({ width: 1, color: MEDALLION_INNER_STROKE, alpha: 0.8 })
  }, [])
  return <pixiGraphics draw={draw} alpha={alpha} />
}

// -----------------------------------------------------------------------------------------------
// Fase 1 -- anillo binario (+ cuña verde opcional) con percent/label AFUERA, en columnas fijas.
// -----------------------------------------------------------------------------------------------

// Se achica un arco hacia su propio ángulo medio a medida que `progress` sube de 0 a 1 -- misma
// función que ya usaba el diseño viejo para la transición fase1<->fase2 (ver Donut más abajo),
// reutilizada acá tal cual.
function shrinkArcTowardMidAngle(startAngle: number, sweep: number, progress: number) {
  const midAngle = startAngle + sweep / 2
  const newSweep = sweep * (1 - progress)
  return { startAngle: midAngle - newSweep / 2, sweep: newSweep }
}

interface StatSide {
  label: string
  value: number
  range?: string
  // Nombre de categoría tal como lo emite useSpinStatsCycle.activeCategory -- comparado contra
  // `activeCategory` para saber si ESTE lado es el que hay que resaltar en este instante (ver
  // comentario de segments más abajo). undefined = este lado nunca se resalta (green).
  category?: SpinStatsCategory
}

interface AccentStatRowProps {
  y: number
  icon: 'roulette' | 'scales' | 'bars'
  accentColor: number
  accentBright: number
  percentStyle: TextStyle
  labelStyle: TextStyle
  left: StatSide
  right: StatSide
  green?: number
  // Color/bright/estilos del lado DERECHO -- opcionales, default al neutral genérico (gris cálido,
  // igual para las 3 filas) que ya usaba RED/BLACK. EVEN/ODD y HIGH/LOW ahora pasan los suyos
  // propios (ODD_COLOR/LOW_COLOR, elegidos para combinar con el acento de su fila) en vez de caer
  // en ese mismo gris -- ver llamadas en SpinStatsPanel().
  rightColor?: number
  rightBright?: number
  rightPercentStyle?: TextStyle
  rightLabelStyle?: TextStyle
  // Categoría resaltada en este instante por el ciclo real (useSpinStatsCycle) -- null cuando
  // ninguna lo está (arranque del panel, transiciones de máscara). Determina cuál de los 2-3
  // segmentos de ESTA fila (si alguno) recibe bright-edge + glow -- ver segments más abajo.
  activeCategory: SpinStatsCategory | null
  transitionProgress: number
}

function AccentStatRow({
  y,
  icon,
  accentColor,
  accentBright,
  percentStyle,
  labelStyle,
  left,
  right,
  green = 0,
  rightColor = NEUTRAL_ARC_COLOR,
  rightBright = NEUTRAL_BRIGHT,
  rightPercentStyle = NEUTRAL_PERCENT_STYLE,
  rightLabelStyle = NEUTRAL_LABEL_STYLE,
  activeCategory,
  transitionProgress,
}: AccentStatRowProps) {
  const total = left.value + green + right.value

  // Ángulo de arranque -90° (12 en punto) avanzando en sentido ANTIHORARIO (sweep negativo) --
  // así el lado coloreado (izquierda) queda del lado izquierdo/abajo de la dona, como en la
  // referencia, en vez del sentido horario por defecto de la mayoría de librerías de gráficos.
  // g.arc() (igual que Canvas 2D) siempre barre en la dirección de ángulo CRECIENTE de start a
  // end, sin importar el signo de `sweep` con el que se calculó -- un sweep "negativo" no dibuja
  // hacia atrás, dibuja el arco COMPLEMENTARIO (confirmado visualmente: con sweep negativo el lado
  // accent terminaba pintado del lado derecho, invertido). Por eso acá el barrido es SIEMPRE
  // positivo/creciente (igual que ya usa Donut de fase 2, comprobado correcto) arrancando en -90°
  // (12 en punto) -- para que el lado accent (izquierda/abajo, como pide la referencia) quede
  // dibujado ahí, el truco es el ORDEN: neutral (derecha) va PRIMERO (ocupa el tramo creciente
  // inicial, hacia la derecha) y accent (izquierda) va ÚLTIMO (ocupa el resto, que "envuelve" por
  // abajo/izquierda de vuelta hasta cerrar el círculo en 12).
  //
  // Cada segmento lleva su propio `bright` (tono para cuando SEA el activo) y `category` (para
  // saber si lo es) -- el color de RELLENO del anillo (accentColor/NEUTRAL_ARC_COLOR/GREEN_COLOR)
  // es siempre el mismo pase lo que pase; lo único que cambia con activeCategory es cuál segmento
  // suma el borde brillante + glow (ver activeEntry más abajo), igual que ya hace fase 2.
  const segments = useMemo(() => {
    let angle = -Math.PI / 2
    const order: { fraction: number; color: number; bright: number; category?: SpinStatsCategory }[] = [
      { fraction: total > 0 ? right.value / total : 0, color: rightColor, bright: rightBright, category: right.category },
    ]
    if (green > 0) order.push({ fraction: total > 0 ? green / total : 0, color: GREEN_COLOR, bright: GREEN_COLOR })
    order.push({ fraction: total > 0 ? left.value / total : 0, color: accentColor, bright: accentBright, category: left.category })

    return order.map((entry) => {
      const sweep = entry.fraction * Math.PI * 2
      const startAngle = angle
      angle += sweep
      return { ...entry, startAngle, sweep }
    })
  }, [total, left.value, left.category, green, right.value, right.category, accentColor, accentBright, rightColor, rightBright])

  const activeEntry = activeCategory ? segments.find((entry) => entry.category === activeCategory) : undefined

  // Un GlowFilter por fila, recreado solo cuando cambia el color activo (mismo patrón que ya usa
  // Donut/fase 2 más abajo) -- nunca por frame, y como activeCategory solo puede señalar UNA
  // categoría a la vez en todo el panel, nunca hay dos filas con un GlowFilter "en uso" compitiendo.
  const activeGlowFilter = useMemo(
    () =>
      new GlowFilter({
        distance: 20,
        outerStrength: 1.2,
        innerStrength: 0,
        color: activeEntry?.bright ?? 0xffffff,
        quality: 0.3,
        alpha: 0.8,
      }),
    [activeEntry?.bright],
  )

  const midRadius = DONUT_OUTER_RADIUS - DONUT_RING_WIDTH / 2

  const drawOutline = useCallback((g: PixiGraphics) => {
    g.clear()
    g.setStrokeStyle({ width: 1, color: DONUT_OUTLINE_COLOR, alpha: DONUT_OUTLINE_ALPHA })
    g.circle(0, 0, DONUT_OUTER_RADIUS)
    g.stroke()
    g.circle(0, 0, DONUT_OUTER_RADIUS - DONUT_RING_WIDTH)
    g.stroke()
  }, [])

  const drawDivider = useCallback((g: PixiGraphics) => {
    g.clear()
    g.rect(-0.5, -DONUT_OUTER_RADIUS, 1, DONUT_OUTER_RADIUS * 2)
    g.fill({ color: DONUT_CENTER_DIVIDER_COLOR, alpha: 0.8 })
  }, [])

  const drawBase = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      for (const entry of segments) {
        const arc = shrinkArcTowardMidAngle(entry.startAngle, entry.sweep, transitionProgress)
        if (arc.sweep === 0) continue
        g.setStrokeStyle({ width: DONUT_RING_WIDTH, color: entry.color })
        g.moveTo(Math.cos(arc.startAngle) * midRadius, Math.sin(arc.startAngle) * midRadius)
        g.arc(0, 0, midRadius, arc.startAngle, arc.startAngle + arc.sweep)
        g.stroke()
      }
    },
    [segments, transitionProgress, midRadius],
  )

  // Mismo mecanismo que drawGlow en Donut (fase 2, más abajo): redibuja la banda COMPLETA (mismo
  // ancho/radio que drawBase, no un borde fino) del segmento activo, en su tono `bright`, encima
  // del anillo base -- el GlowFilter envuelve esa banda entera, así el segmento activo se ve
  // brillando de punta a punta, no solo un filo. `bright` (no `color`) para que el lado neutral
  // (BLACK/ODD/LOW, muy oscuro en reposo) también se vea brillar de verdad al activarse -- fase 2
  // no necesita esta distinción porque sus 3 colores de grupo ya son bien visibles de por sí.
  const drawActiveEdge = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      if (!activeEntry) return
      const arc = shrinkArcTowardMidAngle(activeEntry.startAngle, activeEntry.sweep, transitionProgress)
      if (arc.sweep === 0) return
      g.setStrokeStyle({ width: DONUT_RING_WIDTH, color: activeEntry.bright })
      g.moveTo(Math.cos(arc.startAngle) * midRadius, Math.sin(arc.startAngle) * midRadius)
      g.arc(0, 0, midRadius, arc.startAngle, arc.startAngle + arc.sweep)
      g.stroke()
    },
    [activeEntry, transitionProgress, midRadius],
  )

  const fadeAlpha = 1 - transitionProgress
  const leftPercent = total > 0 ? Math.round((left.value / total) * 100) : 0
  const rightPercent = total > 0 ? Math.round((right.value / total) * 100) : 0

  // Percent baja + se difumina, label(+range) sube + se difumina -- mismo criterio que usaba el
  // diseño viejo para el texto radial de fase 2 (ver PERCENT_EXIT_Y_OFFSET/LABEL_EXIT_Y_OFFSET
  // originales), con magnitudes más chicas acordes al tamaño de este texto.
  const percentShift = transitionProgress * 10
  const labelShift = transitionProgress * 10
  const donutCenterY = y + SECTION_HEIGHT / 2

  return (
    <pixiContainer>
      <pixiText
        text={`${leftPercent}%`}
        style={percentStyle}
        x={LEFT_COLUMN_X}
        y={donutCenterY - 6 + percentShift}
        anchor={{ x: 0.5, y: 1 }}
        alpha={fadeAlpha}
      />
      <pixiText
        text={left.label}
        style={labelStyle}
        x={LEFT_COLUMN_X}
        y={donutCenterY + 6 - labelShift}
        anchor={{ x: 0.5, y: 0 }}
        alpha={fadeAlpha}
      />
      {left.range && (
        <pixiText
          text={left.range}
          style={RANGE_STYLE}
          x={LEFT_COLUMN_X}
          y={donutCenterY + 26 - labelShift}
          anchor={{ x: 0.5, y: 0 }}
          alpha={fadeAlpha}
        />
      )}

      <pixiText
        text={`${rightPercent}%`}
        style={rightPercentStyle}
        x={RIGHT_COLUMN_X}
        y={donutCenterY - 6 + percentShift}
        anchor={{ x: 0.5, y: 1 }}
        alpha={fadeAlpha}
      />
      <pixiText
        text={right.label}
        style={rightLabelStyle}
        x={RIGHT_COLUMN_X}
        y={donutCenterY + 6 - labelShift}
        anchor={{ x: 0.5, y: 0 }}
        alpha={fadeAlpha}
      />
      {right.range && (
        <pixiText
          text={right.range}
          style={RANGE_STYLE}
          x={RIGHT_COLUMN_X}
          y={donutCenterY + 26 - labelShift}
          anchor={{ x: 0.5, y: 0 }}
          alpha={fadeAlpha}
        />
      )}

      <pixiContainer x={CENTER_COLUMN_X} y={donutCenterY}>
        <pixiGraphics draw={drawOutline} alpha={fadeAlpha} />
        <pixiGraphics draw={drawDivider} alpha={fadeAlpha} />
        <pixiGraphics draw={drawBase} />
        {activeEntry && <pixiGraphics draw={drawActiveEdge} filters={[activeGlowFilter]} />}
        <Medallion alpha={fadeAlpha} />
        <CenterIcon type={icon} alpha={fadeAlpha} />
      </pixiContainer>
    </pixiContainer>
  )
}

// -----------------------------------------------------------------------------------------------
// Fase 2 -- docenas/columnas: SIN cambios de lógica ni de animación. Se conservan tal cual:
// segmentAngles (ángulo/sweep derivados de value/total, mismo useMemo), activeLabel/activeEntry
// (mismo lookup por label), shrinkArcTowardMidAngle (mismo crecimiento/achique de arco, mismos
// parámetros), el glow-solo-en-el-activo redibujando la banda COMPLETA por encima del anillo
// dimeado (mismo mecanismo que ya usa AccentStatRow en fase 1), el texto radial adentro del
// anillo con sus mismos bisectores/fade/offsets, y el fade de entrada/salida (fadeAlpha,
// transitionProgress). Lo único que cambia es el ESTILO VISUAL del trazo, separado en
// DOZEN_COLUMN_DONUT_STYLE (reskin premium casino pedido explícitamente: cyan/plata fría/grafito,
// gap angular entre sectores, profundidad sutil vía bandas highlight/shadow, glow por sector) --
// ver drawArcSegment más abajo, el único lugar que lee este config.
// -----------------------------------------------------------------------------------------------

// Mismo estilo de anillo que fase 1 (AccentStatRow, más arriba: drawBase/drawActiveEdge/
// activeGlowFilter) -- trazo plano de un solo color por sector, sin gap angular ni bandas de
// highlight/shadow, mismo DONUT_RING_WIDTH/DONUT_OUTER_RADIUS/DONUT_OUTLINE_COLOR compartidos.
// `base` reusa FIRST/SECOND/THIRD_GROUP_COLOR (mismas constantes que ya trae `segments[i].color`,
// la data) para que el anillo nunca pueda desincronizarse de esos valores; `bright` es el tono que
// se usa SOLO para el glow-cuando-está-activo (igual rol que RED_BRIGHT/EVEN_BRIGHT/HIGH_BRIGHT/
// NEUTRAL_BRIGHT en fase 1) -- versión más clara/saturada de ESE MISMO hue (no un tono aparte como
// blanco puro o gris), para que el glow se sienta "el mismo color prendiéndose más fuerte" en vez
// de un color desconectado del sector.
const DOZEN_COLUMN_DONUT_STYLE = {
  sectors: [
    { base: FIRST_GROUP_COLOR, bright: 0xff8fc6 },
    { base: SECOND_GROUP_COLOR, bright: 0xffe6f0 },
    { base: THIRD_GROUP_COLOR, bright: 0xd97ab5 },
  ],
} as const

// Texto de fase 2 movido de "radial, adentro del anillo" (3 pares de percent/label apretados
// contra el hueco central, ilegibles a este tamaño) a columnas FUERA del anillo -- mismo criterio
// que ya usa AccentStatRow (fase 1) con LEFT_COLUMN_X/RIGHT_COLUMN_X, ver más arriba. index 0
// (siempre el sector cyan, ver DOZEN_COLUMN_DONUT_STYLE) va solo a la izquierda; index 1/2 (plata/
// grafito) comparten la columna derecha, uno arriba y otro abajo. Puramente posición de texto --
// no toca el ángulo/sweep/percent ya calculado, solo DÓNDE se dibuja el resultado.
const PHASE2_TEXT_POSITIONS = [
  { x: LEFT_COLUMN_X, percentY: -8, labelY: 0 },
  { x: RIGHT_COLUMN_X, percentY: -10, labelY: -10 },
  { x: RIGHT_COLUMN_X, percentY: 58, labelY: 60 },
] as const

const PERCENT_EXIT_Y_OFFSET = 10
const LABEL_EXIT_Y_OFFSET = 10

interface DonutSegment {
  label: string
  value: number
  color: number
}

interface DonutBlock {
  segments: DonutSegment[]
  activeLabel?: string
}

function Donut({
  y,
  segments,
  activeLabel,
  transitionProgress,
  icon,
}: {
  y: number
  segments: DonutSegment[]
  activeLabel?: string
  transitionProgress: number
  icon: 'roulette' | 'scales' | 'bars'
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)

  // Sin cambios: mismo ángulo/sweep por segmento derivado de value/total. Se agrega `index`
  // (posición fija first/second/third) únicamente para que el dibujo pueda mirar
  // DOZEN_COLUMN_DONUT_STYLE.sectors[index] -- no participa del cálculo de ángulos.
  const segmentAngles = useMemo(() => {
    let angle = -Math.PI / 2
    return segments.map((segment, index) => {
      const sweep = total > 0 ? (segment.value / total) * Math.PI * 2 : 0
      const entry = { segment, index, startAngle: angle, sweep }
      angle += sweep
      return entry
    })
  }, [segments, total])

  const activeEntry = activeLabel ? segmentAngles.find((entry) => entry.segment.label === activeLabel) : undefined

  // Mismo estilo que drawBase/drawActiveEdge de fase 1: un solo trazo plano, sin gap ni bandas de
  // profundidad. Recibe el color ya resuelto (style.base o style.bright, según el caller) en vez
  // de mirar la data cruda -- así el mismo helper sirve tanto para el anillo base como para el
  // glow-cuando-activo, igual que en fase 1.
  const drawArcSegment = useCallback((g: PixiGraphics, startAngle: number, sweep: number, color: number) => {
    const midRadius = DONUT_OUTER_RADIUS - DONUT_RING_WIDTH / 2
    g.setStrokeStyle({ width: DONUT_RING_WIDTH, color })
    g.moveTo(Math.cos(startAngle) * midRadius, Math.sin(startAngle) * midRadius)
    g.arc(0, 0, midRadius, startAngle, startAngle + sweep)
    g.stroke()
  }, [])

  const drawOutline = useCallback((g: PixiGraphics) => {
    g.clear()
    g.setStrokeStyle({ width: 1, color: DONUT_OUTLINE_COLOR, alpha: DONUT_OUTLINE_ALPHA })
    g.circle(0, 0, DONUT_OUTER_RADIUS)
    g.stroke()
    g.circle(0, 0, DONUT_OUTER_RADIUS - DONUT_RING_WIDTH)
    g.stroke()
  }, [])

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      const midRadius = DONUT_OUTER_RADIUS - DONUT_RING_WIDTH / 2

      // Track neutral de fondo (se ve donde ningún sector cubre, p.ej. la porción de 0/00 que
      // dozen/column no cuentan en ninguna categoría) -- sin cambios, no es uno de los 3 sectores.
      g.setStrokeStyle({ width: DONUT_RING_WIDTH, color: NEUTRAL_ARC_COLOR })
      g.circle(0, 0, midRadius)
      g.stroke()

      for (const entry of segmentAngles) {
        if (entry.sweep <= 0) continue
        const arc = shrinkArcTowardMidAngle(entry.startAngle, entry.sweep, transitionProgress)
        if (arc.sweep <= 0) continue
        const style = DOZEN_COLUMN_DONUT_STYLE.sectors[entry.index] ?? DOZEN_COLUMN_DONUT_STYLE.sectors[DOZEN_COLUMN_DONUT_STYLE.sectors.length - 1]
        drawArcSegment(g, arc.startAngle, arc.sweep, style.base)
      }
    },
    [segmentAngles, drawArcSegment, transitionProgress],
  )

  // Mismo mecanismo que drawActiveEdge en fase 1: redibuja la banda COMPLETA del segmento activo
  // en su tono `bright`, encima del anillo base -- el GlowFilter envuelve esa banda entera.
  const drawGlow = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      if (!activeEntry || activeEntry.sweep <= 0) return
      const arc = shrinkArcTowardMidAngle(activeEntry.startAngle, activeEntry.sweep, transitionProgress)
      if (arc.sweep <= 0) return
      const style = DOZEN_COLUMN_DONUT_STYLE.sectors[activeEntry.index] ?? DOZEN_COLUMN_DONUT_STYLE.sectors[DOZEN_COLUMN_DONUT_STYLE.sectors.length - 1]
      drawArcSegment(g, arc.startAngle, arc.sweep, style.bright)
    },
    [activeEntry, drawArcSegment, transitionProgress],
  )

  // Mismos parámetros que activeGlowFilter de fase 1 (distance 20, outerStrength 1.2, quality 0.3,
  // alpha 0.8) -- antes fase 2 usaba un glow bastante más sutil (distance 8, alpha variable por
  // sector); ahora es el mismo look para las dos fases, solo cambia el color según el sector activo.
  const activeIndex = activeEntry?.index
  const glowFilter = useMemo(() => {
    const style = activeIndex !== undefined ? (DOZEN_COLUMN_DONUT_STYLE.sectors[activeIndex] ?? DOZEN_COLUMN_DONUT_STYLE.sectors[DOZEN_COLUMN_DONUT_STYLE.sectors.length - 1]) : undefined
    return new GlowFilter({
      distance: 20,
      outerStrength: 1.2,
      innerStrength: 0,
      color: style?.bright ?? 0xffffff,
      quality: 0.3,
      alpha: 0.8,
    })
  }, [activeIndex])

  const fadeAlpha = 1 - transitionProgress
  const textAlpha = 1 - transitionProgress
  const donutCenterY = y + SECTION_HEIGHT / 2
  const percentShift = transitionProgress * PERCENT_EXIT_Y_OFFSET
  const labelShift = transitionProgress * LABEL_EXIT_Y_OFFSET

  return (
    <pixiContainer>
      {segments.map((segment, index) => {
        const percent = total > 0 ? Math.round((segment.value / total) * 100) : 0
        const position = PHASE2_TEXT_POSITIONS[index] ?? PHASE2_TEXT_POSITIONS[PHASE2_TEXT_POSITIONS.length - 1]

        return (
          <pixiContainer key={segment.label}>
            <pixiText
              text={`${percent}%`}
              style={PHASE2_PERCENT_STYLES[index]}
              x={position.x}
              y={donutCenterY + position.percentY + percentShift}
              anchor={{ x: 0.5, y: 1 }}
              alpha={textAlpha}
            />
            <pixiText
              text={segment.label}
              style={PHASE2_LABEL_STYLES[index]}
              x={position.x}
              y={donutCenterY + position.labelY - labelShift}
              anchor={{ x: 0.5, y: 0 }}
              alpha={textAlpha}
            />
          </pixiContainer>
        )
      })}

      <pixiContainer x={CENTER_COLUMN_X} y={donutCenterY}>
        <pixiGraphics draw={drawOutline} alpha={fadeAlpha} />
        <pixiGraphics draw={draw} />
        {activeEntry && <pixiGraphics draw={drawGlow} filters={[glowFilter]} />}
        <Medallion alpha={fadeAlpha} />
        <CenterIcon type={icon} alpha={fadeAlpha} />
      </pixiContainer>
    </pixiContainer>
  )
}

function StatDonutBlock({
  y,
  segments,
  activeLabel,
  transitionProgress,
  icon,
}: {
  y: number
  segments: DonutSegment[]
  activeLabel?: string
  transitionProgress: number
  icon: 'roulette' | 'scales' | 'bars'
}) {
  return <Donut y={y} segments={segments} activeLabel={activeLabel} transitionProgress={transitionProgress} icon={icon} />
}

// -----------------------------------------------------------------------------------------------

function Separator({ y, width = PANEL_WIDTH - PANEL_PADDING * 2, x = PANEL_PADDING }: { y: number; width?: number; x?: number }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.rect(0, 0, width, 1)
      g.fill({ color: SEPARATOR_COLOR, alpha: 0.9 })
    },
    [width],
  )
  return <pixiGraphics draw={draw} x={x} y={y} />
}

export function SpinStatsPanel() {
  const { t } = useTranslation()
  const { visibleLeft, visibleTop } = useViewport()
  const rawResults = useResultsStore((state) => state.rawResults)

  // shouldShow/activeCategory/donutSet vienen de useSpinStatsCycle -- fuente única ligada al
  // countdown real (aparece 0.5s después de que Hot/Cold se oculta, se oculta a los 5s de faltar
  // para el próximo sorteo) y compartida con LobbyBackgroundLayer (NumberCellHighlightLayer en
  // fase 1, Dozen/ColumnDiamondIndicatorLayer en fase 2), para que lo resaltado en la rueda
  // siempre coincida con el ciclo de fase 2 de acá.
  const { shouldShow, activeCategory, donutSet } = useSpinStatsCycle()
  const progress = useAnimatedProgress(shouldShow ? 0 : 1, TRANSITION_DURATION_MS, { startAtTarget: true })

  const [renderedDonutSet, setRenderedDonutSet] = useState<SpinStatsDonutSet>(donutSet)
  const [hideTarget, setHideTarget] = useState<0 | 1>(0)
  const hideProgress = useAnimatedProgress(hideTarget, DONUT_TRANSITION_DURATION_MS, { startAtTarget: true })

  useEffect(() => {
    if (donutSet !== renderedDonutSet) {
      setHideTarget(1)
    }
  }, [donutSet, renderedDonutSet])

  useEffect(() => {
    if (hideTarget === 1 && hideProgress >= 1) {
      setRenderedDonutSet(donutSet)
      setHideTarget(0)
    }
  }, [hideTarget, hideProgress, donutSet])

  const exitOffset = easeInOutCubic(progress) * PANEL_EXIT_DISTANCE
  const panelX = visibleLeft + LAYOUT.padding
  const panelY = visibleTop + LAYOUT.padding - exitOffset

  const stats = useMemo(() => computeSpinStats(rawResults, LAST_SPINS_LIMIT), [rawResults])

  // Fase 2: docenas y columnas, 3 categorías reales cada una -- sin cambios respecto al diseño
  // anterior (mismo activeLabel derivado de activeCategory, mismos colores compartidos con los
  // diamantes de la rueda).
  const phase2Blocks: DonutBlock[] = useMemo(
    () => [
      {
        activeLabel:
          activeCategory === 'firstDozen' ? '1-12' : activeCategory === 'secondDozen' ? '13-24' : activeCategory === 'thirdDozen' ? '25-36' : undefined,
        segments: [
          { label: '1-12', value: stats.dozen.firstDozen, color: FIRST_GROUP_COLOR },
          { label: '13-24', value: stats.dozen.secondDozen, color: SECOND_GROUP_COLOR },
          { label: '25-36', value: stats.dozen.thirdDozen, color: THIRD_GROUP_COLOR },
        ],
      },
      {
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

  const sectionsTop = PANEL_PADDING + HEADER_HEIGHT + HEADER_TO_SEPARATOR_GAP
  const section1Y = sectionsTop + SEPARATOR_TO_SECTION_GAP
  const separator2Y = section1Y + SECTION_HEIGHT + SECTION_TO_SEPARATOR_GAP
  const section2Y = separator2Y + SEPARATOR_TO_SECTION_GAP
  const separator3Y = section2Y + SECTION_HEIGHT + SECTION_TO_SEPARATOR_GAP
  const section3Y = separator3Y + SEPARATOR_TO_SECTION_GAP
  const footerSeparatorY = section3Y + SECTION_HEIGHT + SECTION_TO_SEPARATOR_GAP
  const footerY = footerSeparatorY + FOOTER_GAP
  const panelHeight = footerY + FOOTER_HEIGHT + BOTTOM_PADDING

  const drawBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      drawRoundedPanel(g, {
        width: PANEL_WIDTH,
        height: panelHeight,
        radius: PANEL_CORNER_RADIUS,
        fill: PANEL_BG,
        strokeColor: PANEL_BORDER_COLOR,
        strokeWidth: PANEL_BORDER_WIDTH,
        strokeAlpha: PANEL_BORDER_ALPHA,
      })
    },
    [panelHeight],
  )

  return (
    <pixiContainer x={panelX} y={panelY}>
      <pixiGraphics draw={drawBackground} />

      <pixiText text={t('spinStats.title', { count: LAST_SPINS_LIMIT })} style={HEADER_TITLE_STYLE} x={PANEL_PADDING} y={PANEL_PADDING + HEADER_HEIGHT / 2} anchor={titleAnchor} />
      <InfoIcon x={PANEL_WIDTH - PANEL_PADDING - 9} y={PANEL_PADDING + HEADER_HEIGHT / 2} />
      <Separator y={sectionsTop} />

      {renderedDonutSet === 'phase1' ? (
        <>
          <AccentStatRow
            y={section1Y}
            icon="roulette"
            accentColor={RED_COLOR}
            accentBright={RED_BRIGHT}
            percentStyle={RED_PERCENT_STYLE}
            labelStyle={RED_LABEL_STYLE}
            left={{ label: t('spinStats.red'), value: stats.color.red, category: 'red' }}
            right={{ label: t('spinStats.black'), value: stats.color.black, category: 'black' }}
            green={stats.color.green}
            activeCategory={activeCategory}
            transitionProgress={hideProgress}
          />
          <Separator y={separator2Y} />
          <AccentStatRow
            y={section2Y}
            icon="scales"
            accentColor={EVEN_COLOR}
            accentBright={EVEN_BRIGHT}
            percentStyle={EVEN_PERCENT_STYLE}
            labelStyle={EVEN_LABEL_STYLE}
            left={{ label: t('spinStats.even'), value: stats.evenOdd.even, category: 'even' }}
            right={{ label: t('spinStats.odd'), value: stats.evenOdd.odd, category: 'odd' }}
            rightColor={ODD_COLOR}
            rightBright={ODD_BRIGHT}
            rightPercentStyle={ODD_PERCENT_STYLE}
            rightLabelStyle={ODD_LABEL_STYLE}
            activeCategory={activeCategory}
            transitionProgress={hideProgress}
          />
          <Separator y={separator3Y} />
          <AccentStatRow
            y={section3Y}
            icon="bars"
            accentColor={HIGH_COLOR}
            accentBright={HIGH_BRIGHT}
            percentStyle={HIGH_PERCENT_STYLE}
            labelStyle={HIGH_LABEL_STYLE}
            left={{ label: t('spinStats.high'), value: stats.highLow.high, range: '(19-36)', category: 'high' }}
            right={{ label: t('spinStats.low'), value: stats.highLow.low, range: '(1-18)', category: 'low' }}
            rightColor={LOW_COLOR}
            rightBright={LOW_BRIGHT}
            rightPercentStyle={LOW_PERCENT_STYLE}
            rightLabelStyle={LOW_LABEL_STYLE}
            activeCategory={activeCategory}
            transitionProgress={hideProgress}
          />
        </>
      ) : (
        // Fase 2 solo tiene 2 categorías (docenas, columnas) contra las 3 de fase 1 -- ocupan los
        // primeros 2 slots (mismo ritmo section1Y/section2Y) y el 3er slot queda simplemente vacío
        // dentro del panel de altura fija (sin separator3Y ni contenido): se lee como aire extra
        // antes del footer, no como algo roto.
        <>
          <StatDonutBlock y={section1Y} segments={phase2Blocks[0].segments} activeLabel={phase2Blocks[0].activeLabel} transitionProgress={hideProgress} icon="roulette" />
          <Separator y={separator2Y} />
          <StatDonutBlock y={section2Y} segments={phase2Blocks[1].segments} activeLabel={phase2Blocks[1].activeLabel} transitionProgress={hideProgress} icon="bars" />
        </>
      )}

      <Separator y={footerSeparatorY} />
      <InfoIcon x={PANEL_PADDING + 8} y={footerY + FOOTER_HEIGHT / 2} radius={8} />
      <pixiText
        text={t('numbers.disclaimer')}
        style={FOOTER_TEXT_STYLE}
        x={PANEL_PADDING + 22}
        y={footerY + FOOTER_HEIGHT / 2}
        anchor={{ x: 0, y: 0.5 }}
      />
    </pixiContainer>
  )
}
