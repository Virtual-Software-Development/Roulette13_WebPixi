import { useCallback, useMemo } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { useTranslation } from 'react-i18next'
import { useViewport } from '../../hooks/useViewport'
import { useAnimatedProgress } from '../../hooks/useAnimatedProgress'
import { HOT_COLD_ENTRY_LIMIT, useHotColdWindow } from '../../hooks/useHotColdWindow'
import type { HotColdEntry } from '../../utils/hotColdNumbers'
import { easeInOutCubic } from '../../utils/easing'
import { drawRoundedPanel } from '../../utils/roundedPanel'
import { createHorizontalGradient, createVerticalGradient } from '../../utils/gradients'
import { LAYOUT } from '../../layout/layout.constants'
import { InfoIcon } from '../common/InfoIcon'

extend({ Container, Graphics, Text })

// -----------------------------------------------------------------------------------------------
// Layout: panel vertical con dos secciones (HOT arriba, COLD abajo), cada una con hasta
// HOT_COLD_ENTRY_LIMIT filas [badge][barra de frecuencia][hits][%]. Reemplaza el diseño temporal
// anterior (dos columnas de círculos hot/cold lado a lado) -- misma fuente de datos
// (useHotColdWindow), mismo mecanismo de entrada/salida (useAnimatedProgress + easeInOutCubic),
// solo cambia la representación visual.
// -----------------------------------------------------------------------------------------------

const PANEL_WIDTH = 340
const PANEL_PADDING = 22
const PANEL_CORNER_RADIUS = 14
const PANEL_BG = 0x040f1a
const PANEL_BORDER_COLOR = 0x4b5866
const PANEL_BORDER_ALPHA = 0.55
const PANEL_BORDER_WIDTH = 1.3

const TITLE_HEIGHT = 24
const SUBTITLE_GAP = 5
const SUBTITLE_HEIGHT = 17
const HEADER_SEPARATOR_GAP = 11
const HEADER_SEPARATOR_WIDTH = 128
const HEADER_SEPARATOR_COLOR = 0x182433
const HEADER_TO_SECTION_GAP = 16

const SECTION_HEADER_HEIGHT = 20
const SECTION_HEADER_TO_ROWS_GAP = 12
// Antes 38 -- subido para que el panel completo (HOT + COLD + leyenda + footer) alcance la misma
// altura visual que el panel de historial (LastGame + GameList) y que SpinStatsPanel, pedido
// explícito de que los tres paneles se sientan del mismo tamaño en pantalla.
const ROW_HEIGHT = 53
const SECTION_TO_SEPARATOR_GAP = 14
const LONG_SEPARATOR_COLOR = 0x1d2b38

const LEGEND_GAP_TOP = 18
const LEGEND_DOT_ROW_HEIGHT = 20
const LEGEND_DESCRIPTION_GAP = 3
const LEGEND_DESCRIPTION_HEIGHT = 14
const LEGEND_TO_FOOTER_SEPARATOR_GAP = 16

const FOOTER_GAP = 14
const FOOTER_HEIGHT = 18
// Antes 20 -- +4 para que panelHeight cierre exacto en la misma altura que el panel de historial
// (ver ROW_HEIGHT más arriba).
const BOTTOM_PADDING = 24

// Columnas compartidas por header de sección y filas -- badge/bar/hits/% siempre alineados sobre
// la misma grilla (ver sección 13 del brief: "no colocar elementos con offsets independientes").
const BADGE_WIDTH = 34
const BADGE_HEIGHT = 30
const BADGE_RADIUS = 4.5
const BAR_X = PANEL_PADDING + BADGE_WIDTH + 12
const BAR_WIDTH = 150
const BAR_HEIGHT = 13
const BAR_TRACK_RADIUS = 4
const BAR_TRACK_COLOR = 0x111923
const BAR_MIN_FILL_WIDTH = 6
const HITS_COLUMN_X = BAR_X + BAR_WIDTH + 22
const PERCENT_COLUMN_X = PANEL_WIDTH - PANEL_PADDING

const HOT_ICON_COLOR = 0xff5a35
const HOT_LABEL_COLOR = 0xff5a35
const COLD_ICON_COLOR = 0x258de8
const COLD_LABEL_COLOR = 0x258de8
const COLUMN_HEADER_COLOR = 0xa9a7a8

// Progresión rank 1->5 (más caliente a menos caliente), un poco más naranja/ámbar a medida que baja
// la frecuencia -- ver sección 7 del brief. COLD usa el mismo trío de azules para todas las filas
// (sección 12: "todas pueden pertenecer al mismo rango de azul").
const HOT_BAR_GRADIENT_STOPS = [
  [0xc91419, 0xff2730],
  [0xd62418, 0xff4a2d],
  [0xe34219, 0xff872e],
  [0xd85c10, 0xffa12b],
  [0xad7209, 0xffc642],
]
const COLD_BAR_GRADIENT_STOPS: [number, number] = [0x064b8b, 0x188ee7]
const COLD_BAR_GRADIENT_MID = 0x0874c8

const BADGE_HOT_FILL = createVerticalGradient([
  { offset: 0, color: 0xc82a22 },
  { offset: 1, color: 0xa91213 },
])
const BADGE_HOT_BORDER = 0xe33a2c
const BADGE_COLD_FILL = createVerticalGradient([
  { offset: 0, color: 0x0a5fae },
  { offset: 1, color: 0x075aa5 },
])
const BADGE_COLD_BORDER = 0x2188dc

const TITLE_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 20,
  fill: 0xb8b8b8,
  letterSpacing: 0.4,
})

const SUBTITLE_STYLE = new TextStyle({ fontFamily: 'Arial', fontSize: 13, fill: 0xa8a5a5 })

const SECTION_LABEL_STYLE_HOT = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 18,
  fill: HOT_LABEL_COLOR,
  letterSpacing: 0.4,
})
const SECTION_LABEL_STYLE_COLD = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 18,
  fill: COLD_LABEL_COLOR,
  letterSpacing: 0.4,
})

const COLUMN_HEADER_STYLE = new TextStyle({ fontFamily: 'Arial', fontSize: 13, fill: COLUMN_HEADER_COLOR })

const BADGE_TEXT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize: 15, fill: 0xececec })
const HITS_TEXT_STYLE = new TextStyle({ fontFamily: 'Arial', fontSize: 15, fill: 0xb8b6b7 })
const PERCENT_TEXT_STYLE = new TextStyle({ fontFamily: 'Arial', fontSize: 15, fill: 0xb8b6b7 })

const LEGEND_TITLE_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 14, fill: 0xc7c7c9 })
const LEGEND_DESCRIPTION_STYLE = new TextStyle({ fontFamily: 'Arial', fontSize: 12, fill: 0xa7a4a4 })

const FOOTER_TEXT_STYLE = new TextStyle({ fontFamily: 'Arial', fontSize: 12.5, fill: 0x96989c })
const leftAnchor = { x: 0, y: 0.5 }
const rightAnchor = { x: 1, y: 0.5 }
const centerAnchor = { x: 0.5, y: 0.5 }

// -----------------------------------------------------------------------------------------------
// Iconos propios (sin emoji: su apariencia varía por SO -- ver sección 5 del brief) dibujados 100%
// con Graphics, mismo criterio que StatsBarsIcon en GameList.tsx.
// -----------------------------------------------------------------------------------------------

// Llama estilizada -- un polígono en zigzag (no una curva realista), suficiente como pictograma a
// este tamaño.
function FireIcon({ x, y, size = 15, color = HOT_ICON_COLOR }: { x: number; y: number; size?: number; color?: number }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      const s = size / 16
      g.poly([
        8 * s, 0,
        12 * s, 5 * s,
        10 * s, 8 * s,
        14 * s, 12 * s,
        8 * s, 16 * s,
        2 * s, 12 * s,
        6 * s, 8 * s,
        4 * s, 5 * s,
      ])
      g.fill(color)
    },
    [size, color],
  )
  return <pixiGraphics draw={draw} x={x} y={y} />
}

// Copo de nieve -- 3 líneas por el centro a 60° con una pequeña marca perpendicular cerca de cada
// punta, en vez de un asterisco liso.
function SnowflakeIcon({ x, y, size = 15, color = COLD_ICON_COLOR }: { x: number; y: number; size?: number; color?: number }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      const r = size / 2
      const cx = r
      const cy = r
      const tickLength = r * 0.32
      g.setStrokeStyle({ width: 1.4, color })
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI) / 3
        const dx = Math.cos(angle)
        const dy = Math.sin(angle)
        const x0 = cx - dx * r
        const y0 = cy - dy * r
        const x1 = cx + dx * r
        const y1 = cy + dy * r
        g.moveTo(x0, y0)
        g.lineTo(x1, y1)

        const px = -dy
        const py = dx
        for (const sign of [1, -1]) {
          const tx = cx + dx * r * 0.55 * sign
          const ty = cy + dy * r * 0.55 * sign
          g.moveTo(tx - px * tickLength, ty - py * tickLength)
          g.lineTo(tx + px * tickLength, ty + py * tickLength)
        }
      }
      g.stroke()
    },
    [size, color],
  )
  return <pixiGraphics draw={draw} x={x} y={y} />
}

function Separator({ x, y, width, color = LONG_SEPARATOR_COLOR, alpha = 1 }: { x: number; y: number; width: number; color?: number; alpha?: number }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.rect(0, 0, width, 1)
      g.fill({ color, alpha })
    },
    [width, color, alpha],
  )
  return <pixiGraphics draw={draw} x={x} y={y} />
}

// -----------------------------------------------------------------------------------------------
// Fila de datos [badge][barra][hits][%] -- HOT y COLD comparten este mismo componente, la única
// diferencia es la paleta que reciben (ver sección 20 del brief: "HOT y COLD deben compartir
// prácticamente toda la estructura").
// -----------------------------------------------------------------------------------------------

interface StatRowProps {
  entry: HotColdEntry
  y: number
  barRatio: number
  badgeFill: ReturnType<typeof createVerticalGradient>
  badgeBorder: number
  barGradient: ReturnType<typeof createHorizontalGradient>
}

function StatRow({ entry, y, barRatio, badgeFill, badgeBorder, barGradient }: StatRowProps) {
  const drawBadge = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.roundRect(0, 0, BADGE_WIDTH, BADGE_HEIGHT, BADGE_RADIUS)
      g.fill(badgeFill)
      g.setStrokeStyle({ width: 1, color: badgeBorder })
      g.stroke()
    },
    [badgeFill, badgeBorder],
  )

  const fillWidth = Math.max(BAR_MIN_FILL_WIDTH, BAR_WIDTH * barRatio)

  const drawTrack = useCallback((g: PixiGraphics) => {
    g.clear()
    g.roundRect(0, 0, BAR_WIDTH, BAR_HEIGHT, BAR_TRACK_RADIUS)
    g.fill(BAR_TRACK_COLOR)
  }, [])

  const drawFill = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.roundRect(0, 0, fillWidth, BAR_HEIGHT, BAR_TRACK_RADIUS)
      g.fill(barGradient)
    },
    [fillWidth, barGradient],
  )

  return (
    <pixiContainer x={0} y={y}>
      <pixiContainer x={PANEL_PADDING} y={(ROW_HEIGHT - BADGE_HEIGHT) / 2}>
        <pixiGraphics draw={drawBadge} />
        <pixiText text={String(entry.pocket)} style={BADGE_TEXT_STYLE} x={BADGE_WIDTH / 2} y={BADGE_HEIGHT / 2} anchor={centerAnchor} />
      </pixiContainer>

      <pixiContainer x={BAR_X} y={(ROW_HEIGHT - BAR_HEIGHT) / 2}>
        <pixiGraphics draw={drawTrack} />
        <pixiGraphics draw={drawFill} />
      </pixiContainer>

      <pixiText text={String(entry.hits)} style={HITS_TEXT_STYLE} x={HITS_COLUMN_X} y={ROW_HEIGHT / 2} anchor={centerAnchor} />
      <pixiText
        text={`${entry.percentage.toFixed(1)}%`}
        style={PERCENT_TEXT_STYLE}
        x={PERCENT_COLUMN_X}
        y={ROW_HEIGHT / 2}
        anchor={rightAnchor}
      />
    </pixiContainer>
  )
}

interface SectionProps {
  y: number
  labelText: string
  icon: 'fire' | 'snow'
  labelStyle: TextStyle
  entries: HotColdEntry[]
  maxHits: number
  barGradients: ReturnType<typeof createHorizontalGradient>[]
  badgeFill: ReturnType<typeof createVerticalGradient>
  badgeBorder: number
}

function Section({ y, labelText, icon, labelStyle, entries, maxHits, barGradients, badgeFill, badgeBorder }: SectionProps) {
  const { t } = useTranslation()
  return (
    <pixiContainer x={0} y={y}>
      {icon === 'fire' ? (
        <FireIcon x={PANEL_PADDING} y={(SECTION_HEADER_HEIGHT - 15) / 2} />
      ) : (
        <SnowflakeIcon x={PANEL_PADDING} y={(SECTION_HEADER_HEIGHT - 15) / 2} />
      )}
      <pixiText
        text={labelText}
        style={labelStyle}
        x={PANEL_PADDING + 22}
        y={SECTION_HEADER_HEIGHT / 2}
        anchor={leftAnchor}
      />
      <pixiText text={t('numbers.hitsColumn')} style={COLUMN_HEADER_STYLE} x={HITS_COLUMN_X} y={SECTION_HEADER_HEIGHT / 2} anchor={centerAnchor} />
      <pixiText text={t('numbers.percentColumn')} style={COLUMN_HEADER_STYLE} x={PERCENT_COLUMN_X} y={SECTION_HEADER_HEIGHT / 2} anchor={rightAnchor} />

      {entries.map((entry, index) => (
        <StatRow
          key={`${labelText}-${entry.pocket}`}
          entry={entry}
          y={SECTION_HEADER_HEIGHT + SECTION_HEADER_TO_ROWS_GAP + index * ROW_HEIGHT}
          barRatio={maxHits > 0 ? entry.hits / maxHits : 0}
          badgeFill={badgeFill}
          badgeBorder={badgeBorder}
          barGradient={barGradients[index] ?? barGradients[barGradients.length - 1]}
        />
      ))}
    </pixiContainer>
  )
}

export function NumberPanelHotCold() {
  const { t } = useTranslation()
  const { visibleLeft, visibleTop } = useViewport()

  // shouldShow/hotEntries/coldEntries vienen de useHotColdWindow -- misma fuente que usa
  // HotColdNumberChipLayer (ver LobbyBackgroundLayer), así ambos muestran siempre los mismos
  // números durante la misma ventana de la ronda. Sale hacia arriba (no hacia los costados, para
  // no chocar con Header/GameList).
  const { shouldShow, hotEntries, coldEntries, totalSpins } = useHotColdWindow()
  // startAtTarget: si al cargar la página no corresponde mostrarlo (ya se
  // pasó el umbral de la ronda), no debe verse ni un instante antes de
  // deslizarse hacia afuera -- arranca directo en la posición oculta.
  const progress = useAnimatedProgress(shouldShow ? 0 : 1, 550, { startAtTarget: true })
  // El panel ahora es mucho más alto que el viejo diseño de dos columnas (ver PANEL_HEIGHT) -- el
  // SIDE_EXIT_DISTANCE compartido (550, afinado para paneles bajos como Header/Footer) ya no
  // alcanza para sacarlo completo de pantalla, mismo problema que resolvió SpinStatsPanel con su
  // propio PANEL_EXIT_DISTANCE. Antes 850 -- alcanzaba mientras panelHeight rondaba los 706, pero
  // tras subir ROW_HEIGHT (panelHeight ahora ~860, para igualar la altura del historial/SpinStats,
  // ver ese comentario) volvía a quedar corto y el footer asomaba arriba en vez de ocultarse del
  // todo. Mismo valor que usa SpinStatsPanel (misma altura objetivo, mismo margen de sobra).
  const PANEL_EXIT_DISTANCE = 1150
  const exitOffset = easeInOutCubic(progress) * PANEL_EXIT_DISTANCE

  const panelX = visibleLeft + LAYOUT.padding
  const panelY = visibleTop + LAYOUT.padding - exitOffset

  const hotBarGradients = useMemo(
    () => HOT_BAR_GRADIENT_STOPS.map(([start, end]) => createHorizontalGradient([{ offset: 0, color: start }, { offset: 1, color: end }])),
    [],
  )
  const coldBarGradient = useMemo(
    () =>
      createHorizontalGradient([
        { offset: 0, color: COLD_BAR_GRADIENT_STOPS[0] },
        { offset: 0.5, color: COLD_BAR_GRADIENT_MID },
        { offset: 1, color: COLD_BAR_GRADIENT_STOPS[1] },
      ]),
    [],
  )
  const coldBarGradients = useMemo(() => Array(HOT_COLD_ENTRY_LIMIT).fill(coldBarGradient), [coldBarGradient])

  // Un solo máximo compartido entre HOT y COLD (no el máximo de cada lista por separado) -- así
  // las barras COLD (siempre de frecuencia baja) quedan visiblemente cortas frente a las HOT, en
  // vez de que la cold más alta casi llene su track igual que la hot más alta (ver sección 12 del
  // brief: "las barras COLD son mucho más cortas").
  const sharedMaxHits = Math.max(1, ...hotEntries.map((entry) => entry.hits))

  const sectionBlockHeight = SECTION_HEADER_HEIGHT + SECTION_HEADER_TO_ROWS_GAP + HOT_COLD_ENTRY_LIMIT * ROW_HEIGHT

  const titleY = PANEL_PADDING
  const subtitleY = titleY + TITLE_HEIGHT + SUBTITLE_GAP
  const headerSeparatorY = subtitleY + SUBTITLE_HEIGHT + HEADER_SEPARATOR_GAP
  const hotSectionY = headerSeparatorY + HEADER_TO_SECTION_GAP
  const hotSeparatorY = hotSectionY + sectionBlockHeight + SECTION_TO_SEPARATOR_GAP
  const coldSectionY = hotSeparatorY + HEADER_TO_SECTION_GAP
  const coldSeparatorY = coldSectionY + sectionBlockHeight + SECTION_TO_SEPARATOR_GAP
  const legendY = coldSeparatorY + LEGEND_GAP_TOP
  const legendDescriptionY = legendY + LEGEND_DOT_ROW_HEIGHT + LEGEND_DESCRIPTION_GAP
  const footerSeparatorY = legendDescriptionY + LEGEND_DESCRIPTION_HEIGHT + LEGEND_TO_FOOTER_SEPARATOR_GAP
  const footerY = footerSeparatorY + FOOTER_GAP
  const panelHeight = footerY + FOOTER_HEIGHT + BOTTOM_PADDING

  const contentWidth = PANEL_WIDTH - PANEL_PADDING * 2

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

  const legendColumnWidth = contentWidth / 2

  return (
    <pixiContainer x={panelX} y={panelY}>
      <pixiGraphics draw={drawBackground} />

      <pixiText text={t('numbers.title')} style={TITLE_STYLE} x={PANEL_PADDING} y={titleY} />
      <InfoIcon x={PANEL_WIDTH - PANEL_PADDING - 9} y={titleY + TITLE_HEIGHT / 2} />
      <pixiText text={t('numbers.subtitle', { count: totalSpins })} style={SUBTITLE_STYLE} x={PANEL_PADDING} y={subtitleY} />
      <Separator x={PANEL_PADDING} y={headerSeparatorY} width={HEADER_SEPARATOR_WIDTH} color={HEADER_SEPARATOR_COLOR} alpha={0.9} />

      <Section
        y={hotSectionY}
        labelText={t('numbers.hot')}
        icon="fire"
        labelStyle={SECTION_LABEL_STYLE_HOT}
        entries={hotEntries}
        maxHits={sharedMaxHits}
        barGradients={hotBarGradients}
        badgeFill={BADGE_HOT_FILL}
        badgeBorder={BADGE_HOT_BORDER}
      />
      <Separator x={PANEL_PADDING} y={hotSeparatorY} width={contentWidth} />

      <Section
        y={coldSectionY}
        labelText={t('numbers.cold')}
        icon="snow"
        labelStyle={SECTION_LABEL_STYLE_COLD}
        entries={coldEntries}
        maxHits={sharedMaxHits}
        barGradients={coldBarGradients}
        badgeFill={BADGE_COLD_FILL}
        badgeBorder={BADGE_COLD_BORDER}
      />
      <Separator x={PANEL_PADDING} y={coldSeparatorY} width={contentWidth} />

      <pixiContainer x={PANEL_PADDING} y={legendY}>
        <pixiGraphics
          draw={(g: PixiGraphics) => {
            g.clear()
            g.circle(7, LEGEND_DOT_ROW_HEIGHT / 2, 7)
            g.fill(0xff453a)
          }}
        />
        <pixiText text={t('numbers.hot')} style={LEGEND_TITLE_STYLE} x={22} y={LEGEND_DOT_ROW_HEIGHT / 2} anchor={leftAnchor} />
        <pixiText text={t('numbers.hotDescription')} style={LEGEND_DESCRIPTION_STYLE} x={0} y={LEGEND_DOT_ROW_HEIGHT + LEGEND_DESCRIPTION_GAP} />

        <Separator x={legendColumnWidth} y={2} width={1} color={0x2a3540} alpha={0.9} />

        <pixiGraphics
          draw={(g: PixiGraphics) => {
            g.clear()
            g.circle(legendColumnWidth + 12 + 7, LEGEND_DOT_ROW_HEIGHT / 2, 7)
            g.fill(0x1478ce)
          }}
        />
        <pixiText
          text={t('numbers.cold')}
          style={LEGEND_TITLE_STYLE}
          x={legendColumnWidth + 12 + 22}
          y={LEGEND_DOT_ROW_HEIGHT / 2}
          anchor={leftAnchor}
        />
        <pixiText
          text={t('numbers.coldDescription')}
          style={LEGEND_DESCRIPTION_STYLE}
          x={legendColumnWidth + 12}
          y={LEGEND_DOT_ROW_HEIGHT + LEGEND_DESCRIPTION_GAP}
        />
      </pixiContainer>

      <Separator x={PANEL_PADDING} y={footerSeparatorY} width={contentWidth} />
      <InfoIcon x={PANEL_PADDING + 8} y={footerY + FOOTER_HEIGHT / 2} radius={8} />
      <pixiText
        text={t('numbers.disclaimer')}
        style={FOOTER_TEXT_STYLE}
        x={PANEL_PADDING + 22}
        y={footerY + FOOTER_HEIGHT / 2}
        anchor={leftAnchor}
      />
    </pixiContainer>
  )
}
