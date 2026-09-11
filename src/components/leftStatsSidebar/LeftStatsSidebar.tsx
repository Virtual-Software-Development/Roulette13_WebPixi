import { useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { GlowFilter } from 'pixi-filters'
import { useTranslation } from 'react-i18next'
import { useViewport } from '../../hooks/useViewport'
import { useAnimatedProgress } from '../../hooks/useAnimatedProgress'
import { useDrawCycleStore } from '../../store/useDrawCycleStore'
import { useHotColdWindow } from '../../hooks/useHotColdWindow'
import { LAYOUT } from '../../layout/layout.constants'
import { easeInOutCubic } from '../../utils/easing'
import { drawRoundedPanel } from '../../utils/roundedPanel'
import { createVerticalGradient } from '../../utils/gradients'
import { getRouletteColor } from '../../utils/rouletteColors'
import { formatMoney } from '../../utils/moneyFormat'
import { InfoIcon } from '../common/InfoIcon'
import type { HotColdEntry } from '../../utils/hotColdNumbers'
import type { WheelPocket } from '../../types/wheel'
import type { LiveTableBetsData } from '../../types/liveTableBets'

extend({ Container, Graphics, Text })

// -----------------------------------------------------------------------------------------------
// Sidebar de estadísticas del lado IZQUIERDO -- espejo arquitectónico de LiveTableBetsPanel.tsx
// (mismo patrón exacto: overlay Pixi propio, visible solo mientras useDrawCycleStore.active es
// true, mismo mecanismo de entrada/salida). Vive en un canvas separado (ver
// LeftStatsSidebarOverlay.tsx) por el mismo motivo que LiveTableBetsPanel: el video de resultado
// (z-index:5) tapa el canvas principal mientras juega.
//
// NO reemplaza a NumberPanelHotCold/SpinStatsPanel (los paneles del lobby) -- esos viven en una
// ventana de tiempo distinta (lobbyInfoVisible, se ocultan justo cuando `active` pasa a true) y
// siguen sin tocarse. Este componente solo REUTILIZA su misma fuente de datos de hot/cold
// (useHotColdWindow) para no duplicar el algoritmo, no su visibilidad ni su UI.
//
// Root 100% transparente (pedido explícito): el <pixiContainer> raíz nunca dibuja un fondo propio,
// cada tarjeta interna (CurrentGame/Top10/Hot/Cold/Info) dibuja el suyo por separado.
// -----------------------------------------------------------------------------------------------

const SIDEBAR_WIDTH = 340
const MODULE_GAP = 14
const CARD_RADIUS = 12
const CARD_PADDING_X = 16

// Alturas fijas de los módulos chicos -- el Top 10 se lleva todo lo que sobra del alto disponible
// (ver cálculo de top10Height en LeftStatsSidebar más abajo), no al revés.
const CURRENT_GAME_HEIGHT = 72
// Corrimiento vertical de la tarjeta Current Game -- negativo la sube (pedido explícito), sin
// afectar la posición del resto de los módulos (ver currentGameY en LeftStatsSidebar).
const CURRENT_GAME_Y_OFFSET = -50
const HOT_COLD_HEIGHT = 150
const INFO_FOOTER_HEIGHT = 76
const TOP10_ROW_COUNT = 10
const TOP10_HEADER_HEIGHT = 44
const TOP10_ROWS_PADDING_Y = 6
// Piso de seguridad si algún día el viewport disponible fuera muy bajo -- nunca debería activarse
// en el kiosco real, pero evita alturas negativas si pasara.
const MIN_TOP10_HEIGHT = 220

// Paleta navy oscura -- misma familia que ya usa LiveTableBetsPanel (PANEL_BG_TOP≈0x08111a) para
// integrarse visualmente, definida acá como constante propia (cada panel de este proyecto arma la
// suya, ver comentario equivalente en ResultStatsPanel.tsx).
const CARD_BG_TOP = 0x0a141d
const CARD_BG_MID = 0x070f16
const CARD_BG_BOTTOM = 0x05090d
const CARD_BG_FILL = createVerticalGradient([
  { offset: 0, color: CARD_BG_TOP },
  { offset: 0.5, color: CARD_BG_MID },
  { offset: 1, color: CARD_BG_BOTTOM },
])
const CARD_BORDER_COLOR = 0x33434e
const CARD_BORDER_ALPHA = 0.4
const CARD_BORDER_WIDTH = 1

// Hot/Cold van un toque más discretos que el Top 10 (sección 13 del brief: "poca opacidad si
// encaja con el resto del proyecto") -- mismo tono, menos presencia.
const MODULE_BG_COLOR = 0x061017
const MODULE_BG_ALPHA = 0.78

const TEXT_PRIMARY = 0xe8edf0
const TEXT_SECONDARY = 0x9aa4ab
const TEXT_MUTED = 0x6b757c

const GOLD_COLOR = 0xffb522
const FLAME_COLOR = 0xff2438
const COLD_COLOR = 0x3db6ea
const RED_ACCENT = 0xe21b2d

const RANK_STYLE = new TextStyle({ fontFamily: 'Arial', fontSize: 14, fill: TEXT_SECONDARY })
const AMOUNT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 16, fill: TEXT_PRIMARY })
const PLACEHOLDER_STYLE = new TextStyle({ fontFamily: 'Arial', fontSize: 12, fill: TEXT_MUTED })
// Exclusivo de Hot/Cold desde que Top10 tiene su propio TOP10_TITLE_STYLE -- agrandado a juego
// (pedido explícito: "Hot/Cold Numbers deben ser más grandes").
const MODULE_TITLE_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '700', fontSize: 15, letterSpacing: 0.6, fill: TEXT_PRIMARY })
// Título del Top 10 más grande que MODULE_TITLE_STYLE (Hot/Cold) a propósito -- constante propia
// para no agrandar también los títulos de Hot/Cold, que comparten MODULE_TITLE_STYLE.
const TOP10_TITLE_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '700', fontSize: 15, letterSpacing: 0.6, fill: TEXT_PRIMARY })
const CURRENT_GAME_LABEL_STYLE = new TextStyle({ fontFamily: 'Arial', fontSize: 11, letterSpacing: 0.6, fill: TEXT_SECONDARY })
const CURRENT_GAME_VALUE_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '700', fontSize: 27, fill: TEXT_PRIMARY })
const FOOTER_TEXT_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 10.5,
  lineHeight: 14,
  fill: TEXT_SECONDARY,
  wordWrap: true,
  wordWrapWidth: SIDEBAR_WIDTH - CARD_PADDING_X * 2 - 30,
})

// Glows chicos y compartidos (instancias únicas a nivel módulo, no una por ícono -- sección 23 del
// brief: "no recrear filtros innecesariamente"). Todos MUY sutiles a propósito (sección 20: "evitar
// glows grandes").
const GOLD_GLOW = new GlowFilter({ distance: 4, outerStrength: 0.8, innerStrength: 0, color: GOLD_COLOR, quality: 0.4, alpha: 0.35 })
const FLAME_GLOW = new GlowFilter({ distance: 5, outerStrength: 1, innerStrength: 0, color: FLAME_COLOR, quality: 0.4, alpha: 0.4 })
const COLD_GLOW = new GlowFilter({ distance: 5, outerStrength: 1, innerStrength: 0, color: COLD_COLOR, quality: 0.4, alpha: 0.4 })
const CHIPS_GLOW = new GlowFilter({ distance: 4, outerStrength: 0.8, innerStrength: 0, color: 0xffae1a, quality: 0.4, alpha: 0.3 })
const CURRENT_GAME_GLOW = new GlowFilter({ distance: 6, outerStrength: 1, innerStrength: 0, color: RED_ACCENT, quality: 0.4, alpha: 0.45 })

// Ficha de ruleta -- color REAL del número (rojo/negro/verde vía getRouletteColor, el mismo helper
// que ya usa el resto del proyecto), nunca decidido por pertenecer a Top10/Hot/Cold (sección 16 del
// brief: HOT/COLD se comunican con el ícono del header del módulo, no recoloreando la ficha).
const RED_CHIP_FILL = createVerticalGradient([
  { offset: 0, color: 0xed2939 },
  { offset: 0.55, color: 0xd71928 },
  { offset: 1, color: 0xa80d18 },
])
const BLACK_CHIP_FILL = createVerticalGradient([
  { offset: 0, color: 0x161c22 },
  { offset: 1, color: 0x080b0f },
])
const GREEN_CHIP_FILL = createVerticalGradient([
  { offset: 0, color: 0x198d4b },
  { offset: 1, color: 0x11733c },
])
const BLACK_CHIP_BORDER = 0x3a4750
const CHIP_TEXT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '700', fontSize: 12.5, fill: 0xffffff })
const centerAnchor = { x: 0.5, y: 0.5 }

// `fontSize` opcional -- por defecto usa CHIP_TEXT_STYLE tal cual (HotColdSlot no lo pasa, sigue
// exactamente igual); Top10 (ver TopBetNumbersRow) pide un tamaño más grande para número+monto sin
// afectar el tamaño de las fichas de Hot/Cold, que comparten este mismo componente.
function RouletteChip({ pocket, size = 26, fontSize }: { pocket: WheelPocket; size?: number; fontSize?: number }) {
  const color = getRouletteColor(pocket)
  const fill = color === 'red' ? RED_CHIP_FILL : color === 'green' ? GREEN_CHIP_FILL : BLACK_CHIP_FILL
  const textStyle = useMemo(
    () => (fontSize === undefined ? CHIP_TEXT_STYLE : new TextStyle({ fontFamily: 'Arial', fontWeight: '700', fontSize, fill: 0xffffff })),
    [fontSize],
  )

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      const r = size / 2
      g.circle(0, 0, r)
      g.fill(fill)
      g.setStrokeStyle({ width: 1, color: color === 'black' ? BLACK_CHIP_BORDER : 0x000000, alpha: color === 'black' ? 0.9 : 0.35 })
      g.stroke()
      // highlight superior muy sutil -- sección 8 del brief: "no apariencia 3D exagerada".
      g.ellipse(0, -r * 0.42, r * 0.55, r * 0.26)
      g.fill({ color: 0xffffff, alpha: 0.12 })
    },
    [fill, size, color],
  )

  return (
    <pixiContainer>
      <pixiGraphics draw={draw} />
      <pixiText text={String(pocket)} style={textStyle} anchor={centerAnchor} />
    </pixiContainer>
  )
}

// Stack de fichas doradas -- mismo lenguaje visual que ChipStack (LiveTableBetsPanel.tsx) y
// CoinStackIcon (ResultStatsPanel.tsx), redibujado localmente a propósito (ninguno de los tres
// paneles importa el ícono de otro, mismo criterio ya establecido en esta sesión).
function ChipsIcon({ size = 15 }: { size?: number }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      for (let i = 0; i < 3; i++) {
        const cy = -i * size * 0.16
        g.ellipse(0, cy, size * 0.42, size * 0.16)
        g.fill(i === 2 ? 0xffbf33 : 0xf79b0b)
        g.stroke({ width: 0.8, color: 0xac6a00, alpha: 0.7 })
      }
    },
    [size],
  )
  return <pixiGraphics draw={draw} filters={[CHIPS_GLOW]} />
}

// Ícono de "ronda en curso" -- no existe un asset ni ícono equivalente en el proyecto (revisado:
// solo InfoIcon en components/common), así que se dibuja a mano: un aro con marcas radiales +
// centro, evocando la rueda/ronda en vez de un ícono genérico sin relación.
function CurrentGameIcon({ size = 20 }: { size?: number }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      const r = size / 2
      g.circle(0, 0, r)
      g.stroke({ width: 1.4, color: 0xd9dee1, alpha: 0.85 })
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        const inner = r * 0.55
        const outer = r * 0.85
        g.moveTo(Math.cos(a) * inner, Math.sin(a) * inner)
        g.lineTo(Math.cos(a) * outer, Math.sin(a) * outer)
        g.stroke({ width: 1, color: 0xd9dee1, alpha: 0.5 })
      }
      g.circle(0, 0, r * 0.2)
      g.fill({ color: 0xd9dee1, alpha: 0.9 })
    },
    [size],
  )
  return <pixiGraphics draw={draw} />
}

// Estrella dorada (header del Top 10) -- construida a mano (5 puntas), sin asset/librería.
function StarIcon({ size = 14 }: { size?: number }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      const outer = size / 2
      const inner = outer * 0.45
      const step = Math.PI / 5
      let rot = -Math.PI / 2
      g.moveTo(Math.cos(rot) * outer, Math.sin(rot) * outer)
      for (let i = 0; i < 5; i++) {
        rot += step
        g.lineTo(Math.cos(rot) * inner, Math.sin(rot) * inner)
        rot += step
        g.lineTo(Math.cos(rot) * outer, Math.sin(rot) * outer)
      }
      g.closePath()
      g.fill(GOLD_COLOR)
    },
    [size],
  )
  return <pixiGraphics draw={draw} filters={[GOLD_GLOW]} />
}

// Llama (header de Hot Numbers) -- silueta armada con dos bezier por mitad + núcleo interior más
// claro, sin asset/librería.
function FlameIcon({ size = 14 }: { size?: number }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      const s = size
      g.moveTo(0, s * 0.5)
      g.bezierCurveTo(-s * 0.5, s * 0.15, -s * 0.32, -s * 0.35, 0, -s * 0.5)
      g.bezierCurveTo(s * 0.34, -s * 0.12, s * 0.4, s * 0.28, 0, s * 0.5)
      g.closePath()
      g.fill(FLAME_COLOR)
      g.moveTo(0, s * 0.32)
      g.bezierCurveTo(-s * 0.2, s * 0.1, -s * 0.12, -s * 0.15, 0, -s * 0.2)
      g.bezierCurveTo(s * 0.14, -s * 0.02, s * 0.16, s * 0.18, 0, s * 0.32)
      g.closePath()
      g.fill({ color: 0xffb238, alpha: 0.85 })
    },
    [size],
  )
  return <pixiGraphics draw={draw} filters={[FLAME_GLOW]} />
}

// Copo de nieve (header de Cold Numbers) -- 3 líneas cruzadas, abstracción mínima suficiente a
// este tamaño, sin asset/librería.
function SnowflakeIcon({ size = 14 }: { size?: number }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      const r = size / 2
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI
        const dx = Math.cos(a) * r
        const dy = Math.sin(a) * r
        g.moveTo(-dx, -dy)
        g.lineTo(dx, dy)
        g.stroke({ width: 1.4, color: COLD_COLOR, alpha: 0.9, cap: 'round' })
      }
    },
    [size],
  )
  return <pixiGraphics draw={draw} filters={[COLD_GLOW]} />
}

function drawCard(g: PixiGraphics, width: number, height: number, fill: ReturnType<typeof createVerticalGradient> | { color: number; alpha: number }) {
  g.clear()
  drawRoundedPanel(g, {
    width,
    height,
    radius: CARD_RADIUS,
    fill,
    strokeColor: CARD_BORDER_COLOR,
    strokeWidth: CARD_BORDER_WIDTH,
    strokeAlpha: CARD_BORDER_ALPHA,
  })
}

// -----------------------------------------------------------------------------------------------

function CurrentGameCard({ width, height, drawNo, label }: { width: number; height: number; drawNo: string | undefined; label: string }) {
  const drawBg = useCallback(
    (g: PixiGraphics) => {
      drawCard(g, width, height, CARD_BG_FILL)
      // línea roja muy fina cerca de abajo (sección 3 del brief) -- apenas visible.
      g.setStrokeStyle({ width: 1, color: RED_ACCENT, alpha: 0.25 })
      g.moveTo(CARD_RADIUS, height - 4)
      g.lineTo(width - CARD_RADIUS, height - 4)
      g.stroke()
    },
    [width, height],
  )

  const iconCx = CARD_PADDING_X + 18
  const iconCy = height / 2
  const drawIconBadge = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.circle(0, 0, 18)
      g.fill({ color: 0x0c0f12, alpha: 0.9 })
      g.setStrokeStyle({ width: 1.4, color: RED_ACCENT, alpha: 0.8 })
      g.stroke()
    },
    [],
  )

  return (
    <pixiContainer>
      <pixiGraphics draw={drawBg} />
      <pixiContainer x={iconCx} y={iconCy} filters={[CURRENT_GAME_GLOW]}>
        <pixiGraphics draw={drawIconBadge} />
        <CurrentGameIcon size={20} />
      </pixiContainer>
      <pixiText text={label} style={CURRENT_GAME_LABEL_STYLE} x={iconCx + 32} y={height / 2 - 12} anchor={{ x: 0, y: 0.5 }} />
      <pixiText text={drawNo ?? '--'} style={CURRENT_GAME_VALUE_STYLE} x={iconCx + 32} y={height / 2 + 10} anchor={{ x: 0, y: 0.5 }} />
    </pixiContainer>
  )
}

// -----------------------------------------------------------------------------------------------

interface TopBetRow {
  pocket: WheelPocket
  total: number
}

function TopBetNumbersRow({ width, height, rank, row, showSeparator }: { width: number; height: number; rank: number; row: TopBetRow | undefined; showSeparator: boolean }) {
  const drawSeparator = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      if (!showSeparator) return
      g.setStrokeStyle({ width: 1, color: 0x648ca0, alpha: 0.08 })
      g.moveTo(0, 0)
      g.lineTo(width, 0)
      g.stroke()
    },
    [width, showSeparator],
  )

  return (
    <pixiContainer y={0}>
      <pixiGraphics draw={drawSeparator} />
      <pixiText text={String(rank)} style={RANK_STYLE} x={0} y={height / 2} anchor={{ x: 0, y: 0.5 }} />
      <pixiContainer x={34} y={height / 2}>
        {row ? <RouletteChip pocket={row.pocket} size={30} fontSize={15} /> : <pixiText text="--" style={PLACEHOLDER_STYLE} anchor={centerAnchor} />}
      </pixiContainer>
      <pixiText text={row ? formatMoney(row.total) : '--'} style={AMOUNT_STYLE} x={width - 34} y={height / 2} anchor={{ x: 1, y: 0.5 }} />
      <pixiContainer x={width - 12} y={height / 2}>
        <ChipsIcon size={18} />
      </pixiContainer>
    </pixiContainer>
  )
}

function TopBetNumbersCard({ width, height, rows, title }: { width: number; height: number; rows: (TopBetRow | undefined)[]; title: string }) {
  const drawBg = useCallback((g: PixiGraphics) => drawCard(g, width, height, CARD_BG_FILL), [width, height])
  const drawHeaderSeparator = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.setStrokeStyle({ width: 1, color: 0x648ca0, alpha: 0.14 })
      g.moveTo(0, 0)
      g.lineTo(width - CARD_PADDING_X * 2, 0)
      g.stroke()
    },
    [width],
  )

  const rowsAreaHeight = height - TOP10_HEADER_HEIGHT - TOP10_ROWS_PADDING_Y * 2
  const rowHeight = rowsAreaHeight / TOP10_ROW_COUNT
  const rowsTop = TOP10_HEADER_HEIGHT + TOP10_ROWS_PADDING_Y

  return (
    <pixiContainer>
      <pixiGraphics draw={drawBg} />
      <pixiContainer x={CARD_PADDING_X} y={24}>
        <StarIcon size={18} />
        <pixiText text={title} style={TOP10_TITLE_STYLE} x={20} anchor={{ x: 0, y: 0.5 }} />
      </pixiContainer>
      <pixiGraphics draw={drawHeaderSeparator} x={CARD_PADDING_X} y={40} />
      <pixiContainer x={CARD_PADDING_X} y={rowsTop}>
        {rows.map((row, index) => (
          <pixiContainer key={index} y={index * rowHeight}>
            <TopBetNumbersRow width={width - CARD_PADDING_X * 2} height={rowHeight} rank={index + 1} row={row} showSeparator={index > 0} />
          </pixiContainer>
        ))}
      </pixiContainer>
    </pixiContainer>
  )
}

// -----------------------------------------------------------------------------------------------

// Solo el número (ficha) -- pedido explícito: sin la cantidad de repeticiones (`entry.hits`)
// debajo. Ficha agrandada a juego con el resto del módulo (antes 26) -- `fontSize` explícito
// (antes usaba el default de CHIP_TEXT_STYLE, 12.5, que quedaba chico dentro de una ficha de 42).
function HotColdSlot({ entry }: { entry: HotColdEntry | undefined }) {
  return <pixiContainer>{entry ? <RouletteChip pocket={entry.pocket} size={42} fontSize={20} /> : <pixiText text="--" style={PLACEHOLDER_STYLE} anchor={centerAnchor} />}</pixiContainer>
}

function HotColdModule({ width, height, icon, title, entries }: { width: number; height: number; icon: ReactNode; title: string; entries: HotColdEntry[] }) {
  const drawBg = useCallback((g: PixiGraphics) => drawCard(g, width, height, { color: MODULE_BG_COLOR, alpha: MODULE_BG_ALPHA }), [width, height])
  const slots: (HotColdEntry | undefined)[] = Array.from({ length: 5 }, (_, i) => entries[i])
  const contentWidth = width - CARD_PADDING_X * 2
  const slotWidth = contentWidth / 5
  // Fila de fichas centrada en el espacio que queda debajo del título -- ya no un valor fijo
  // pensado para HOT_COLD_HEIGHT=118, sino relativo al alto real del módulo.
  const slotsY = 24 + (height - 24) / 2 + 6

  return (
    <pixiContainer>
      <pixiGraphics draw={drawBg} />
      <pixiContainer x={CARD_PADDING_X} y={24}>
        {icon}
        <pixiText text={title} style={MODULE_TITLE_STYLE} x={20} anchor={{ x: 0, y: 0.5 }} />
      </pixiContainer>
      {slots.map((entry, i) => (
        <pixiContainer key={i} x={CARD_PADDING_X + i * slotWidth + slotWidth / 2} y={slotsY}>
          <HotColdSlot entry={entry} />
        </pixiContainer>
      ))}
    </pixiContainer>
  )
}

// -----------------------------------------------------------------------------------------------

function InfoFooterCard({ width, height, text }: { width: number; height: number; text: string }) {
  const drawBg = useCallback((g: PixiGraphics) => drawCard(g, width, height, { color: MODULE_BG_COLOR, alpha: MODULE_BG_ALPHA }), [width, height])

  return (
    <pixiContainer>
      <pixiGraphics draw={drawBg} />
      <InfoIcon x={CARD_PADDING_X + 8} y={height / 2} radius={8} color={0x8fa3ad} strokeWidth={1} />
      <pixiText text={text} style={FOOTER_TEXT_STYLE} x={CARD_PADDING_X + 26} y={height / 2} anchor={{ x: 0, y: 0.5 }} />
    </pixiContainer>
  )
}

// -----------------------------------------------------------------------------------------------

const TRANSITION_DURATION_MS = 200
const ENTRY_OFFSET_PX = 16

export function LeftStatsSidebar({ data }: { data: LiveTableBetsData }) {
  const { t } = useTranslation()
  const { visibleLeft, visibleTop, visibleBottom } = useViewport()
  const active = useDrawCycleStore((state) => state.active)
  const pendingDrawNo = useDrawCycleStore((state) => state.pendingResult?.drawNo)
  // MISMA fuente que NumberPanelHotCold (el panel de hot/cold del Lobby) -- no se recalcula acá,
  // solo se ignora su `shouldShow` (esa es la ventana de tiempo DEL LOBBY; la visibilidad de este
  // sidebar es la del video de resultado, `active`, ver más abajo).
  const { hotEntries, coldEntries } = useHotColdWindow()

  const progress = useAnimatedProgress(active ? 1 : 0, TRANSITION_DURATION_MS, { startAtTarget: true })
  const eased = easeInOutCubic(progress)

  // Top 10 Most Bet Numbers -- ordena la MISMA `data` que ya recibe LiveTableBetsPanel (misma prop,
  // mismo mock/fuente hoy; el día que exista un endpoint real, ambos paneles lo reciben igual sin
  // tocar este archivo). Nunca una segunda fuente/mock propia.
  const top10: (TopBetRow | undefined)[] = useMemo(() => {
    const sorted = [...data.numbers].sort((a, b) => b.total - a.total).slice(0, TOP10_ROW_COUNT)
    const rows: (TopBetRow | undefined)[] = sorted.map((bet) => ({ pocket: bet.pocket, total: bet.total }))
    while (rows.length < TOP10_ROW_COUNT) rows.push(undefined)
    return rows
  }, [data.numbers])

  // CURRENT_GAME_Y_OFFSET (negativo) se descuenta acá del presupuesto de altura de Current Game --
  // el hueco que deja esa tarjeta al subirse se lo queda Top10 (la sección flexible) en vez de
  // quedar como espacio vacío sin usar (pedido explícito: "más alto todo en el Top 10").
  const availableHeight = visibleBottom - visibleTop - LAYOUT.padding * 2
  const fixedHeight = CURRENT_GAME_HEIGHT + CURRENT_GAME_Y_OFFSET + HOT_COLD_HEIGHT * 2 + INFO_FOOTER_HEIGHT + MODULE_GAP * 4
  const top10Height = Math.max(availableHeight - fixedHeight, MIN_TOP10_HEIGHT)

  const sidebarX = visibleLeft + LAYOUT.padding - (1 - eased) * ENTRY_OFFSET_PX
  const sidebarY = visibleTop + LAYOUT.padding

  let cursorY = 0
  const currentGameY = cursorY + CURRENT_GAME_Y_OFFSET
  // Arranca del borde inferior REAL de Current Game (ya con su offset aplicado), no del que tendría
  // sin subirse -- así el espacio que gana Top10 en top10Height (ver arriba) se refleja también en
  // dónde empieza, sin dejar un hueco vacío entre ambas tarjetas.
  cursorY = currentGameY + CURRENT_GAME_HEIGHT + MODULE_GAP
  const top10Y = cursorY
  cursorY += top10Height + MODULE_GAP
  const hotY = cursorY
  cursorY += HOT_COLD_HEIGHT + MODULE_GAP
  const coldY = cursorY
  cursorY += HOT_COLD_HEIGHT + MODULE_GAP
  const infoY = cursorY

  return (
    <pixiContainer x={sidebarX} y={sidebarY} alpha={eased}>
      <pixiContainer y={currentGameY}>
        <CurrentGameCard width={SIDEBAR_WIDTH} height={CURRENT_GAME_HEIGHT} drawNo={pendingDrawNo} label={`${t('lastGame.currentGame')}:`} />
      </pixiContainer>
      <pixiContainer y={top10Y}>
        <TopBetNumbersCard width={SIDEBAR_WIDTH} height={top10Height} rows={top10} title={t('leftStatsSidebar.top10Title')} />
      </pixiContainer>
      <pixiContainer y={hotY}>
        <HotColdModule width={SIDEBAR_WIDTH} height={HOT_COLD_HEIGHT} icon={<FlameIcon size={18} />} title={t('numbers.hot')} entries={hotEntries} />
      </pixiContainer>
      <pixiContainer y={coldY}>
        <HotColdModule width={SIDEBAR_WIDTH} height={HOT_COLD_HEIGHT} icon={<SnowflakeIcon size={18} />} title={t('numbers.cold')} entries={coldEntries} />
      </pixiContainer>
      <pixiContainer y={infoY}>
        <InfoFooterCard width={SIDEBAR_WIDTH} height={INFO_FOOTER_HEIGHT} text={t('leftStatsSidebar.disclaimer')} />
      </pixiContainer>
    </pixiContainer>
  )
}
