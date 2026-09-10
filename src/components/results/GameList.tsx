import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics, Text as PixiText } from 'pixi.js'
import { useTranslation } from 'react-i18next'
import { useResultsStore } from '../../store/useResultsStore'
import { DESIGN_WIDTH, TABLE_WIDTH_RATIO } from '../../layout/layout.constants'
import { drawRoundedPanel } from '../../utils/roundedPanel'
import { GameRow, ROW_HEIGHT } from './GameRow'
import { LAST_GAME_HEIGHT } from './LastGame'

extend({ Container, Graphics, Text })

const PANEL_CORNER_RADIUS = 20
const PANEL_BG = 0x030c15
const PANEL_BORDER_COLOR = 0x37414b
const PANEL_BORDER_WIDTH = 1.5

const HEADER_PADDING_TOP = 20
const HEADER_TO_ROWS_GAP = 14
const ROWS_START_Y = HEADER_PADDING_TOP + 20 + HEADER_TO_ROWS_GAP

const ROWS_TO_BUTTON_GAP = 18
const BUTTON_HEIGHT = 48
const BUTTON_MARGIN_X = 20
const BOTTOM_PADDING = 20
const BUTTON_CORNER_RADIUS = 8
// Ancho real del ícono de barras (ver StatsBarsIcon: 4 barras de 3px + 3px de gap entre ellas).
const BUTTON_ICON_WIDTH = 21
const BUTTON_ICON_GAP = 14

const HEADER_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 18,
  fontWeight: '600',
  letterSpacing: 0.6,
  fill: 0xa7a8ac,
})

const BUTTON_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 17,
  fontWeight: '600',
  letterSpacing: 0.8,
  fill: 0xd6d7db,
})

interface GameListProps {
  // Sin lógica de navegación propia (no hay router en el proyecto, ver Header.tsx) -- si se pasa,
  // se llama al hacer click en "VIEW FULL HISTORY"; si no, el botón queda visible pero inerte.
  onViewHistory?: () => void
}

function StatsBarsIcon() {
  const draw = useCallback((g: PixiGraphics) => {
    g.clear()
    const heights = [7, 12, 9, 15]
    const barWidth = 3
    const gap = 3
    const baseY = 16
    heights.forEach((h, i) => {
      g.rect(i * (barWidth + gap), baseY - h, barWidth, h)
      g.fill(0xa7a8ac)
    })
  }, [])

  return <pixiGraphics draw={draw} />
}

export function GameList({ onViewHistory }: GameListProps) {
  const { t } = useTranslation()
  const currentWinner = useResultsStore((state) => state.currentWinner)
  const history = useResultsStore((state) => state.history)
  const maxResults = useResultsStore((state) => state.maxResults)
  const [buttonHovered, setButtonHovered] = useState(false)

  // El ancho real del label solo se conoce tras el layout de Pixi (fontFamily/weight no dan un
  // ancho de caracter fijo) -- se mide una vez montado el <pixiText> y se usa para centrar el
  // cluster ícono+texto como un solo bloque dentro del botón, en vez de centrar cada uno por su
  // cuenta (lo que los solapaba: ver commit anterior).
  const buttonLabelRef = useRef<PixiText>(null)
  const [buttonLabelWidth, setButtonLabelWidth] = useState(0)
  useLayoutEffect(() => {
    setButtonLabelWidth(buttonLabelRef.current?.width ?? 0)
  }, [t])

  const tableWidth = DESIGN_WIDTH * TABLE_WIDTH_RATIO
  const tableX = (DESIGN_WIDTH - tableWidth) / 2

  // maxResults ya limita `history` por su cuenta (ver useResultsStore.addResult), pero eso no
  // cuenta a currentWinner -- sin este slice, la lista real mostraba maxResults+1 filas (la fila
  // actual de más). El tope total de GameRow (contando la actual) debe ser maxResults.
  const rows = (currentWinner ? [currentWinner, ...history] : history).slice(0, maxResults)
  const rowsHeight = rows.length * ROW_HEIGHT

  const buttonY = ROWS_START_Y + rowsHeight + ROWS_TO_BUTTON_GAP
  const listHeight = buttonY + BUTTON_HEIGHT + BOTTOM_PADDING
  const buttonWidth = tableWidth - BUTTON_MARGIN_X * 2

  const drawPanel = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      drawRoundedPanel(g, {
        width: tableWidth,
        height: listHeight,
        corners: { topLeft: 0, topRight: 0, bottomLeft: PANEL_CORNER_RADIUS, bottomRight: PANEL_CORNER_RADIUS },
        fill: PANEL_BG,
      })
    },
    [tableWidth, listHeight],
  )

  // Borde exterior de la tarjeta COMPLETA (LastGame + GameList como una sola pieza) -- arranca en
  // -LAST_GAME_HEIGHT (el techo de LastGame) para que las 4 esquinas redondeadas envuelvan ambos
  // bloques a la vez; solo trazo (sin fill), así no importa que GameList lo dibuje encima del
  // contenido de LastGame -- un stroke de 1.5px pegado al borde no tapa nada del interior.
  const drawOuterBorder = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      drawRoundedPanel(g, {
        y: -LAST_GAME_HEIGHT,
        width: tableWidth,
        height: LAST_GAME_HEIGHT + listHeight,
        radius: PANEL_CORNER_RADIUS,
        strokeColor: PANEL_BORDER_COLOR,
        strokeWidth: PANEL_BORDER_WIDTH,
      })
    },
    [tableWidth, listHeight],
  )

  const drawButton = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      drawRoundedPanel(g, {
        width: buttonWidth,
        height: BUTTON_HEIGHT,
        radius: BUTTON_CORNER_RADIUS,
        fill: buttonHovered ? 0x121e2c : 0x0d1620,
        strokeColor: 0x3a4653,
        strokeWidth: 1,
      })
    },
    [buttonWidth, buttonHovered],
  )

  return (
    <pixiContainer x={tableX} y={LAST_GAME_HEIGHT}>
      <pixiGraphics draw={drawPanel} />
      <pixiGraphics draw={drawOuterBorder} />

      <pixiText text={t('gameList.title')} style={HEADER_LABEL_STYLE} x={22} y={HEADER_PADDING_TOP} />

      {rows.map((result, index) => (
        <GameRow key={result.id} result={result} width={tableWidth} y={ROWS_START_Y + index * ROW_HEIGHT} isLive={index === 0} />
      ))}

      <pixiContainer
        x={BUTTON_MARGIN_X}
        y={buttonY}
        eventMode="static"
        cursor="pointer"
        onPointerOver={() => setButtonHovered(true)}
        onPointerOut={() => setButtonHovered(false)}
        onPointerTap={() => onViewHistory?.()}
      >
        <pixiGraphics draw={drawButton} />
        {(() => {
          const clusterWidth = BUTTON_ICON_WIDTH + BUTTON_ICON_GAP + buttonLabelWidth
          const startX = (buttonWidth - clusterWidth) / 2
          return (
            <>
              <pixiContainer x={startX} y={BUTTON_HEIGHT / 2 - 8}>
                <StatsBarsIcon />
              </pixiContainer>
              <pixiText
                ref={buttonLabelRef}
                text={t('gameList.viewFullHistory')}
                style={BUTTON_LABEL_STYLE}
                x={startX + BUTTON_ICON_WIDTH + BUTTON_ICON_GAP}
                y={BUTTON_HEIGHT / 2}
                anchor={{ x: 0, y: 0.5 }}
              />
            </>
          )
        })()}
      </pixiContainer>
    </pixiContainer>
  )
}
