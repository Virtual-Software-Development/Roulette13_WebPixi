import { memo, useCallback, useMemo } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { GlowFilter } from 'pixi-filters'
import { useTranslation } from 'react-i18next'
import { useViewport } from '../../hooks/useViewport'
import { useAnimatedProgress } from '../../hooks/useAnimatedProgress'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'
import { usePulseScale } from '../../hooks/usePulseScale'
import { useDrawCycleStore } from '../../store/useDrawCycleStore'
import { useBetsSummaryStore } from '../../store/useBetsSummaryStore'
import { LAYOUT } from '../../layout/layout.constants'
import { easeInOutCubic } from '../../utils/easing'
import { drawRoundedPanel } from '../../utils/roundedPanel'
import { drawDiamond } from '../../utils/diamond'
import { createVerticalGradient } from '../../utils/gradients'
import { getRouletteColor } from '../../utils/rouletteColors'
import { getColumnGroupPockets } from '../../utils/columnGroups'
import { formatMoney } from '../../utils/moneyFormat'
import type { LobbyGroupBets, LobbyGroupKey, LobbyNumberBets } from '../../types/lobbyLiveBets'
import type { LiveTableBetsData } from '../../types/liveTableBets'

extend({ Container, Graphics, Text })

// -----------------------------------------------------------------------------------------------
// Panel HORIZONTAL de apuestas en vivo del LOBBY -- componente totalmente independiente de
// LiveTableBetsPanel (mesa vertical con chip-stacks que solo se muestra durante el video de
// resultado): este vive en el lobby (useDrawCycleStore.lobbyInfoVisible, no `active`), no tiene
// chip-stacks, y sus totales suben con una animación incremental (useAnimatedNumber). El feedback de
// "acá entró una apuesta" es un pulso de escala (usePulseScale) en el número/monto, no un highlight
// sostenido -- se probó con glow y quedaba más ruidoso que útil para este panel. Los datos vienen de
// useBetsSummaryStore -- los mismos totales reales de /api/bets que ya alimentan
// LiveTableBetsPanel/ResultStatsPanel/LeftStatsSidebar (ver App.tsx: fetchBetsSummary, BETS_LEAD_MS
// antes del video) -- nada de datos simulados/random acá. Como esa store solo se actualiza una vez
// por ronda (no hay todavía un feed en vivo de apuestas individuales), este panel arranca en 0 y
// salta directo al total real de la ronda cuando ese fetch resuelve, en vez de ir subiendo de a
// eventos individuales -- fiel a lo que el backend realmente expone hoy.
//
// Layout: mesa real de 3 filas x 12 columnas (columna 0/00 a la izquierda, apuesta de columna
// "2:1" a la derecha, docenas y apuestas exteriores debajo) -- no una tira plana de 38 celdas.
// Misma derivación matemática (getColumnGroupPockets) que ya usa LiveTableBetsPanel para sus filas
// físicas, solo que acá NO se transpone: la fila de arriba es directamente 'thirdColumn' (3,6,9...
// 36), igual que en una mesa real leída horizontalmente.
// -----------------------------------------------------------------------------------------------

const NUMBER_COL_WIDTH = 66
const ZERO_COL_WIDTH = 66
const COLUMN_BET_WIDTH = 66
const NUMBER_ROW_HEIGHT = 58
const DOZEN_ROW_HEIGHT = 40
// Más alta que DOZEN_ROW_HEIGHT (pedido explícito) -- la fila de apuestas exteriores (low/even/
// red/black/odd/high, ver OUTSIDE_KEYS) queda un poco más alta que la de docenas.
const OUTSIDE_ROW_HEIGHT = 48
const HEADER_HEIGHT = 20
const HEADER_GAP = 8
const PANEL_PADDING = 16
const CELL_GAP = 1.5

const GRID_WIDTH = 12 * NUMBER_COL_WIDTH
const CONTENT_WIDTH = ZERO_COL_WIDTH + GRID_WIDTH + COLUMN_BET_WIDTH
const PANEL_WIDTH = CONTENT_WIDTH + PANEL_PADDING * 2
const GRID_HEIGHT = 3 * NUMBER_ROW_HEIGHT
const PANEL_HEIGHT = PANEL_PADDING + HEADER_HEIGHT + HEADER_GAP + GRID_HEIGHT + DOZEN_ROW_HEIGHT + OUTSIDE_ROW_HEIGHT + PANEL_PADDING

const CORNER_RADIUS = 10
const BORDER_COLOR = 0xa0b9c4
const BORDER_ALPHA = 0.26
const BORDER_WIDTH = 1.4

const PANEL_BG_TOP = 0x08111a
const PANEL_BG_MID = 0x050c11
const PANEL_BG_BOTTOM = 0x03080d
const PANEL_BG_FILL = createVerticalGradient([
  { offset: 0, color: PANEL_BG_TOP },
  { offset: 0.45, color: PANEL_BG_MID },
  { offset: 1, color: PANEL_BG_BOTTOM },
])

const GRID_LINE_COLOR = 0x96a5ae
const GRID_LINE_ALPHA = 0.3
const GRID_LINE_WIDTH = 1

// Entrada/salida: fade + slide vertical (el panel vive anclado abajo, a diferencia del panel
// vertical de LiveTableBetsPanel que desliza en X desde el borde derecho).
const TRANSITION_DURATION_MS = 220
const ENTRY_OFFSET_PX = 24

const RED_TOP = 0x92191c
const RED_MID = 0x7a1518
const RED_BOTTOM = 0x5b0f12
const BLACK_TOP = 0x0c1016
const BLACK_MID = 0x090d12
const BLACK_BOTTOM = 0x050a0f
const GREEN_TOP = 0x063c29
const GREEN_MID = 0x043323
const GREEN_BOTTOM = 0x02291c

const RED_FILL = createVerticalGradient([
  { offset: 0, color: RED_TOP },
  { offset: 0.5, color: RED_MID },
  { offset: 1, color: RED_BOTTOM },
])
const BLACK_FILL = createVerticalGradient([
  { offset: 0, color: BLACK_TOP },
  { offset: 0.5, color: BLACK_MID },
  { offset: 1, color: BLACK_BOTTOM },
])
const GREEN_FILL = createVerticalGradient([
  { offset: 0, color: GREEN_TOP },
  { offset: 0.5, color: GREEN_MID },
  { offset: 1, color: GREEN_BOTTOM },
])

const GROUP_CELL_FILL = 0x0a121a
const GROUP_CELL_ALPHA = 0.85

const TEXT_PRIMARY = 0xf2f0ee
const TEXT_SECONDARY = 0xd4d0cd
const TEXT_MUTED = 0xbdbab7

const TITLE_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 13, letterSpacing: 0.5, fill: 0xe9e7e5 })
const NUMBER_TEXT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '500', fontSize: 14, fill: TEXT_SECONDARY })
const AMOUNT_TEXT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '700', fontSize: 12, fill: TEXT_PRIMARY })
const ZERO_TEXT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '500', fontSize: 14, fill: TEXT_SECONDARY })
const ZERO_AMOUNT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '700', fontSize: 12, fill: 0xbfe3d1 })
const GROUP_LABEL_STYLE = new TextStyle({ fontFamily: 'Arial', fontSize: 11, letterSpacing: 0.2, fill: TEXT_MUTED })
const GROUP_AMOUNT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: '600', fontSize: 12, fill: TEXT_PRIMARY })

const DIAMOND_RED_FILL = createVerticalGradient([
  { offset: 0, color: 0xb51517 },
  { offset: 0.55, color: 0x8e1013 },
  { offset: 1, color: 0x690b0e },
])
const DIAMOND_RED_STROKE = 0xea3d37
const DIAMOND_BLACK_FILL = 0x18232e
const DIAMOND_BLACK_STROKE = 0xbeb1a5
const DIAMOND_SIZE = 15

const LIVE_DOT_COLOR = 0xe50914
const LIVE_DOT_CORE_COLOR = 0xff2028

const topAnchor = { x: 0.5, y: 1 }
const bottomAnchor = { x: 0.5, y: 0 }

// Filas físicas de la mesa (no orden 1,2,3...): igual derivación que LiveTableBetsPanel
// (getColumnGroupPockets), pero SIN transponer -- acá la fila de arriba ya es la fila física de
// arriba tal cual se lee en una mesa horizontal real.
const TOP_ROW = getColumnGroupPockets('thirdColumn') // 3,6,9...36 -- fila del lado "00"
const MIDDLE_ROW = getColumnGroupPockets('secondColumn') // 2,5,8...35
const BOTTOM_ROW = getColumnGroupPockets('firstColumn') // 1,4,7...34 -- fila del lado "0"
const GRID_ROWS = [TOP_ROW, MIDDLE_ROW, BOTTOM_ROW]
const GRID_ROW_COLUMN_KEYS: LobbyGroupKey[] = ['thirdColumn', 'secondColumn', 'firstColumn']

interface NumberCellProps {
  pocket: number
  total: number
  x: number
  y: number
  width: number
  height: number
}

// El fondo (rect + borde) NO pulsa -- si escalara la celda entera, el borde invadiría
// momentáneamente a la celda vecina (están pegadas, separadas solo por CELL_GAP). Solo el MONTO
// pulsa (pedido explícito) -- el número/pocket queda fijo, así que el wrapper que escala envuelve
// nada más que el pixiText del monto, no el par completo (ver comentario de GroupCell más abajo).
//
// memo: `total` llega como primitivo (toLobbyBets construye un objeto nuevo por celda en cada
// fetch, pero React.memo compara props primitivas, no identidad del objeto padre) -- una celda solo
// re-renderiza cuando su propio total realmente cambió entre dos snapshots de /api/bets, no en cada
// fetch entero.
const NumberCell = memo(function NumberCell({ pocket, total, x, y, width, height }: NumberCellProps) {
  const color = getRouletteColor(pocket)
  const fill = color === 'red' ? RED_FILL : BLACK_FILL
  const animatedTotal = useAnimatedNumber(total, 600)
  const pulseScale = usePulseScale(total)

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
      <pixiContainer x={width / 2} y={height / 2}>
        <pixiText text={String(pocket)} style={NUMBER_TEXT_STYLE} x={0} y={-1} anchor={topAnchor} />
        <pixiContainer y={3} scale={pulseScale}>
          <pixiText text={formatMoney(animatedTotal)} style={AMOUNT_TEXT_STYLE} anchor={bottomAnchor} />
        </pixiContainer>
      </pixiContainer>
    </pixiContainer>
  )
})

// Columna 0/00 -- una sola forma verde continua que ocupa el alto de las 3 filas de números,
// partida en SOLO 2 mitades (00 arriba, 0 abajo, mismo criterio que ZeroArea en LiveTableBetsPanel
// pero con el split arriba/abajo en vez de izquierda/derecha) -- no en 3 bandas, que dejaba una
// banda del medio sin número leyéndose como un casillero vacío.
//
// El centro de cada mitad (halfHeight/2) puede caer en un píxel fraccionario (.5) según el alto
// total -- ese es exactamente el peor caso para el anti-aliasing de texto (queda repartido entre
// dos filas de píxeles y se ve borroso), por eso ambos centros se redondean antes de usarlos.
// memo: mismo criterio que NumberCell -- zeroTotal/doubleZeroTotal llegan como primitivos y solo
// cambian cuando el total real de 0/00 efectivamente cambia entre dos snapshots de /api/bets.
const ZeroColumn = memo(function ZeroColumn({
  x,
  y,
  width,
  height,
  zeroTotal,
  doubleZeroTotal,
}: {
  x: number
  y: number
  width: number
  height: number
  zeroTotal: number
  doubleZeroTotal: number
}) {
  const animatedZero = useAnimatedNumber(zeroTotal, 600)
  const animatedDoubleZero = useAnimatedNumber(doubleZeroTotal, 600)
  const pulseZero = usePulseScale(zeroTotal)
  const pulseDoubleZero = usePulseScale(doubleZeroTotal)
  const halfHeight = height / 2
  const topBandCenterY = Math.round(halfHeight / 2)
  const bottomBandCenterY = halfHeight + topBandCenterY

  const drawBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      drawRoundedPanel(g, {
        width,
        height,
        corners: { topLeft: 10, bottomLeft: 10, topRight: 0, bottomRight: 0 },
        fill: GREEN_FILL,
        strokeColor: 0x2a9f68,
        strokeWidth: 1.4,
        strokeAlpha: 0.5,
      })
      g.setStrokeStyle({ width: GRID_LINE_WIDTH, color: GRID_LINE_COLOR, alpha: GRID_LINE_ALPHA })
      g.moveTo(0, halfHeight)
      g.lineTo(width, halfHeight)
      g.stroke()
    },
    [width, height, halfHeight],
  )

  return (
    <pixiContainer x={x} y={y}>
      <pixiGraphics draw={drawBackground} />
      <pixiContainer x={width / 2} y={topBandCenterY}>
        <pixiText text="00" style={ZERO_TEXT_STYLE} x={0} y={-1} anchor={topAnchor} />
        <pixiContainer y={3} scale={pulseDoubleZero}>
          <pixiText text={formatMoney(animatedDoubleZero)} style={ZERO_AMOUNT_STYLE} anchor={bottomAnchor} />
        </pixiContainer>
      </pixiContainer>
      <pixiContainer x={width / 2} y={bottomBandCenterY}>
        <pixiText text="0" style={ZERO_TEXT_STYLE} x={0} y={-1} anchor={topAnchor} />
        <pixiContainer y={3} scale={pulseZero}>
          <pixiText text={formatMoney(animatedZero)} style={ZERO_AMOUNT_STYLE} anchor={bottomAnchor} />
        </pixiContainer>
      </pixiContainer>
    </pixiContainer>
  )
})

interface GroupCellProps {
  x: number
  y: number
  width: number
  height: number
  label: string
  total: number
  diamond?: 'red' | 'black'
}

function RedDiamond() {
  const draw = useCallback((g: PixiGraphics) => {
    g.clear()
    drawDiamond(g, { width: DIAMOND_SIZE, height: DIAMOND_SIZE, fill: DIAMOND_RED_FILL, strokeColor: DIAMOND_RED_STROKE, strokeWidth: 1.2 })
  }, [])
  return <pixiGraphics draw={draw} x={-DIAMOND_SIZE / 2} y={-DIAMOND_SIZE / 2} />
}

function BlackDiamond() {
  const draw = useCallback((g: PixiGraphics) => {
    g.clear()
    drawDiamond(g, { width: DIAMOND_SIZE, height: DIAMOND_SIZE, fill: DIAMOND_BLACK_FILL, strokeColor: DIAMOND_BLACK_STROKE, strokeWidth: 1.2 })
  }, [])
  return <pixiGraphics draw={draw} x={-DIAMOND_SIZE / 2} y={-DIAMOND_SIZE / 2} />
}

// El diamante (si lo hay) y el label quedan fuera del wrapper que pulsa -- son decorativos/fijos,
// no el valor que sube, así que no deberían "saltar" cada vez que entra una apuesta (pedido
// explícito: solo el monto pulsa).
//
// memo: mismo criterio que NumberCell -- `total` llega como primitivo, así que solo re-renderiza el
// grupo cuyo total efectivamente cambió entre dos snapshots de /api/bets.
const GroupCell = memo(function GroupCell({ x, y, width, height, label, total, diamond }: GroupCellProps) {
  const animatedTotal = useAnimatedNumber(total, 600)
  const pulseScale = usePulseScale(total)

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.rect(0, 0, width, height)
      g.fill({ color: GROUP_CELL_FILL, alpha: GROUP_CELL_ALPHA })
      g.setStrokeStyle({ width: GRID_LINE_WIDTH, color: GRID_LINE_COLOR, alpha: GRID_LINE_ALPHA })
      g.rect(0, 0, width, height)
      g.stroke()
    },
    [width, height],
  )

  const textX = diamond ? width / 2 + 11 : width / 2

  return (
    <pixiContainer x={x} y={y}>
      <pixiGraphics draw={draw} />
      {diamond && (
        <pixiContainer x={18} y={height / 2}>
          {diamond === 'red' ? <RedDiamond /> : <BlackDiamond />}
        </pixiContainer>
      )}
      <pixiContainer x={textX} y={height / 2}>
        <pixiText text={label} style={GROUP_LABEL_STYLE} x={0} y={-3} anchor={topAnchor} />
        <pixiContainer y={3} scale={pulseScale}>
          <pixiText text={formatMoney(animatedTotal)} style={GROUP_AMOUNT_STYLE} anchor={bottomAnchor} />
        </pixiContainer>
      </pixiContainer>
    </pixiContainer>
  )
})

function LiveIndicator({ x, y }: { x: number; y: number }) {
  const drawDot = useCallback((g: PixiGraphics) => {
    g.clear()
    g.circle(0, 0, 4)
    g.fill(LIVE_DOT_COLOR)
    g.circle(0, -0.4, 1.8)
    g.fill(LIVE_DOT_CORE_COLOR)
  }, [])
  const glow = useMemo(() => new GlowFilter({ distance: 5, outerStrength: 1.1, innerStrength: 0, color: LIVE_DOT_CORE_COLOR, quality: 0.4, alpha: 0.6 }), [])
  return <pixiGraphics draw={drawDot} x={x} y={y} filters={[glow]} />
}

// -----------------------------------------------------------------------------------------------

const OUTSIDE_KEYS: LobbyGroupKey[] = ['low', 'even', 'red', 'black', 'odd', 'high']
const DOZEN_KEYS: LobbyGroupKey[] = ['firstDozen', 'secondDozen', 'thirdDozen']

const ALL_NUMBER_KEYS: string[] = ['0', '00', ...Array.from({ length: 36 }, (_, i) => String(i + 1))]
const ALL_GROUP_KEYS: LobbyGroupKey[] = [
  'firstDozen',
  'secondDozen',
  'thirdDozen',
  'firstColumn',
  'secondColumn',
  'thirdColumn',
  'low',
  'high',
  'even',
  'odd',
  'red',
  'black',
]

// Traduce el snapshot real de /api/bets (useBetsSummaryStore) a la forma que este panel necesita --
// todas las claves presentes y en 0 por defecto (no solo las que vinieron con apuestas), para que
// cada celda siga pudiendo leer `numbers[key]`/`groups[key]` sin checks extra en el render.
function toLobbyBets(data: LiveTableBetsData | null): { numbers: LobbyNumberBets; groups: LobbyGroupBets } {
  const numbers: LobbyNumberBets = {}
  for (const key of ALL_NUMBER_KEYS) numbers[key] = { total: 0 }
  for (const bet of data?.numbers ?? []) numbers[String(bet.pocket)] = { total: bet.total }

  const groups: LobbyGroupBets = {} as LobbyGroupBets
  for (const key of ALL_GROUP_KEYS) groups[key] = { total: 0 }
  if (data?.dozens?.firstDozen != null) groups.firstDozen = { total: data.dozens.firstDozen }
  if (data?.dozens?.secondDozen != null) groups.secondDozen = { total: data.dozens.secondDozen }
  if (data?.dozens?.thirdDozen != null) groups.thirdDozen = { total: data.dozens.thirdDozen }
  if (data?.columns?.firstColumn != null) groups.firstColumn = { total: data.columns.firstColumn }
  if (data?.columns?.secondColumn != null) groups.secondColumn = { total: data.columns.secondColumn }
  if (data?.columns?.thirdColumn != null) groups.thirdColumn = { total: data.columns.thirdColumn }
  if (data?.outside?.low != null) groups.low = { total: data.outside.low }
  if (data?.outside?.high != null) groups.high = { total: data.outside.high }
  if (data?.outside?.even != null) groups.even = { total: data.outside.even }
  if (data?.outside?.odd != null) groups.odd = { total: data.outside.odd }
  if (data?.outside?.red != null) groups.red = { total: data.outside.red }
  if (data?.outside?.black != null) groups.black = { total: data.outside.black }

  return { numbers, groups }
}

interface LaidOutGroupCell {
  key: LobbyGroupKey
  x: number
  y: number
  width: number
  height: number
}

export function LobbyLiveBetsPanel() {
  const { t } = useTranslation()
  const { visibleLeft, visibleRight, visibleBottom } = useViewport()
  const lobbyInfoVisible = useDrawCycleStore((state) => state.lobbyInfoVisible)

  const liveTableBetsData = useBetsSummaryStore((state) => state.liveTableBetsData)
  const { numbers, groups } = useMemo(() => toLobbyBets(liveTableBetsData), [liveTableBetsData])

  const progress = useAnimatedProgress(lobbyInfoVisible ? 1 : 0, TRANSITION_DURATION_MS, { startAtTarget: true })
  const eased = easeInOutCubic(progress)

  const gridTop = PANEL_PADDING + HEADER_HEIGHT + HEADER_GAP
  const gridLeft = PANEL_PADDING + ZERO_COL_WIDTH
  const columnBetX = gridLeft + GRID_WIDTH
  const dozenTop = gridTop + GRID_HEIGHT
  const outsideTop = dozenTop + DOZEN_ROW_HEIGHT

  const groupLabels: Record<LobbyGroupKey, string> = {
    firstDozen: t('lobbyLiveBets.firstDozen'),
    secondDozen: t('lobbyLiveBets.secondDozen'),
    thirdDozen: t('lobbyLiveBets.thirdDozen'),
    firstColumn: t('lobbyLiveBets.column'),
    secondColumn: t('lobbyLiveBets.column'),
    thirdColumn: t('lobbyLiveBets.column'),
    low: t('lobbyLiveBets.low'),
    high: t('lobbyLiveBets.high'),
    even: t('lobbyLiveBets.even'),
    odd: t('lobbyLiveBets.odd'),
    red: t('lobbyLiveBets.red'),
    black: t('lobbyLiveBets.black'),
  }

  const columnBetCells: LaidOutGroupCell[] = GRID_ROW_COLUMN_KEYS.map((key, rowIndex) => ({
    key,
    x: columnBetX + CELL_GAP / 2,
    y: gridTop + rowIndex * NUMBER_ROW_HEIGHT + CELL_GAP / 2,
    width: COLUMN_BET_WIDTH - CELL_GAP,
    height: NUMBER_ROW_HEIGHT - CELL_GAP,
  }))
  const dozenCells: LaidOutGroupCell[] = DOZEN_KEYS.map((key, index) => ({
    key,
    x: gridLeft + index * 4 * NUMBER_COL_WIDTH + CELL_GAP / 2,
    y: dozenTop + CELL_GAP / 2,
    width: 4 * NUMBER_COL_WIDTH - CELL_GAP,
    height: DOZEN_ROW_HEIGHT - CELL_GAP,
  }))
  const outsideCells: LaidOutGroupCell[] = OUTSIDE_KEYS.map((key, index) => ({
    key,
    x: gridLeft + index * 2 * NUMBER_COL_WIDTH + CELL_GAP / 2,
    y: outsideTop + CELL_GAP / 2,
    width: 2 * NUMBER_COL_WIDTH - CELL_GAP,
    height: OUTSIDE_ROW_HEIGHT - CELL_GAP,
  }))
  const allGroupCells = [...columnBetCells, ...dozenCells, ...outsideCells]
  const groupDiamonds: Partial<Record<LobbyGroupKey, 'red' | 'black'>> = { red: 'red', black: 'black' }

  const drawBackground = useCallback((g: PixiGraphics) => {
    g.clear()
    drawRoundedPanel(g, {
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      radius: CORNER_RADIUS,
      fill: PANEL_BG_FILL,
      strokeColor: BORDER_COLOR,
      strokeWidth: BORDER_WIDTH,
      strokeAlpha: BORDER_ALPHA,
    })
  }, [])

  const panelX = (visibleLeft + visibleRight) / 2 - PANEL_WIDTH / 2
  const panelY = visibleBottom - LAYOUT.padding - PANEL_HEIGHT + (1 - eased) * ENTRY_OFFSET_PX

  return (
    <pixiContainer x={panelX} y={panelY} alpha={eased}>
      <pixiGraphics draw={drawBackground} />

      <LiveIndicator x={PANEL_PADDING + 5} y={PANEL_PADDING + HEADER_HEIGHT / 2} />
      <pixiText text={t('lobbyLiveBets.title')} style={TITLE_STYLE} x={PANEL_PADDING + 15} y={PANEL_PADDING + HEADER_HEIGHT / 2} anchor={{ x: 0, y: 0.5 }} />

      <ZeroColumn
        x={PANEL_PADDING}
        y={gridTop}
        width={ZERO_COL_WIDTH}
        height={GRID_HEIGHT}
        zeroTotal={numbers['0']?.total ?? 0}
        doubleZeroTotal={numbers['00']?.total ?? 0}
      />

      {GRID_ROWS.map((row, rowIndex) => (
        <pixiContainer key={rowIndex} y={gridTop + rowIndex * NUMBER_ROW_HEIGHT}>
          {row.map((pocket, colIndex) => (
            <NumberCell
              key={pocket}
              pocket={pocket}
              total={numbers[String(pocket)]?.total ?? 0}
              x={gridLeft + colIndex * NUMBER_COL_WIDTH + CELL_GAP / 2}
              y={CELL_GAP / 2}
              width={NUMBER_COL_WIDTH - CELL_GAP}
              height={NUMBER_ROW_HEIGHT - CELL_GAP}
            />
          ))}
        </pixiContainer>
      ))}

      {allGroupCells.map((cell) => (
        <GroupCell
          key={cell.key}
          x={cell.x}
          y={cell.y}
          width={cell.width}
          height={cell.height}
          label={groupLabels[cell.key]}
          total={groups[cell.key]?.total ?? 0}
          diamond={groupDiamonds[cell.key]}
        />
      ))}
    </pixiContainer>
  )
}
