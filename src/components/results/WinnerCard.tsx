import { useCallback } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { useResultsStore } from '../../store/useResultsStore'
import { useScreenSize } from '../../hooks/useScreenSize'
import { DATE_TIME_VALUE_STYLE } from '../../layout/layout.constants'
import { getRouletteColor, ROULETTE_COLOR_HEX } from '../../utils/rouletteColors'
import {
  BOX_GAP,
  CELL_MARGIN,
  DRAW_BOX_PLACEHOLDER_COLOR,
  DRAW_COLUMN_RATIO,
  PADDING_X,
  ROW_HEIGHT,
  TIME_BOX_PLACEHOLDER_COLOR,
  WINNER_CELL_WIDTH,
} from './ResultRow'
import { TABLE_WIDTH_RATIO } from './ResultsTable'

extend({ Container, Graphics, Text })

const CARD_RADIUS = 48
const LABEL_GAP = 18
const WINNER_ROW_CENTER_Y = 110
const LABEL_OFFSET_Y = -(CARD_RADIUS + LABEL_GAP)

const WINNER_NUMBER_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 36,
  fill: 0xffffff,
})

// Estilo propio para los títulos de columna de WinnerCard (TIME/DRAW NO./WINNER):
// más grande y en negrita que DATE_TIME_LABEL_STYLE (16px, sin negrita), que se
// deja intacto porque también lo usan Header.tsx y Footer.tsx.
const WINNER_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 26,
  fill: 0xffffff,
})

export function WinnerCard() {
  const currentWinner = useResultsStore((state) => state.currentWinner)
  const { width: screenWidth } = useScreenSize()

  const tableWidth = screenWidth * TABLE_WIDTH_RATIO
  const tableX = (screenWidth - tableWidth) / 2
  const circleX = tableWidth - WINNER_CELL_WIDTH / 2 - PADDING_X

  const drawBoxX = tableWidth * DRAW_COLUMN_RATIO
  const circleLeftEdge = circleX - CARD_RADIUS
  const drawBoxWidth = circleLeftEdge - BOX_GAP - drawBoxX
  const timeBoxWidth = drawBoxX - BOX_GAP

  const hex = currentWinner
    ? ROULETTE_COLOR_HEX[getRouletteColor(currentWinner.winningNumber)]
    : 0x1a1a1a

  const drawTimeBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.setFillStyle({ color: TIME_BOX_PLACEHOLDER_COLOR })
      g.roundRect(0, -ROW_HEIGHT / 2, timeBoxWidth, ROW_HEIGHT, 6)
      g.fill()
    },
    [timeBoxWidth],
  )

  const drawDrawBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.setFillStyle({ color: DRAW_BOX_PLACEHOLDER_COLOR })
      g.roundRect(drawBoxX, -ROW_HEIGHT / 2, drawBoxWidth, ROW_HEIGHT, 6)
      g.fill()
    },
    [drawBoxX, drawBoxWidth],
  )

  const drawCircle = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.setFillStyle({ color: hex })
      g.circle(circleX, 0, CARD_RADIUS)
      g.fill()
    },
    [hex, circleX],
  )

  if (!currentWinner) return null

  return (
    <pixiContainer x={tableX} y={WINNER_ROW_CENTER_Y}>
      <pixiText
        text="TIME"
        style={WINNER_LABEL_STYLE}
        x={timeBoxWidth / 2}
        y={LABEL_OFFSET_Y}
        anchor={{ x: 0.5, y: 0.5 }}
      />

      <pixiGraphics draw={drawTimeBox} />
      <pixiText
        text={currentWinner.time}
        style={DATE_TIME_VALUE_STYLE}
        x={timeBoxWidth - CELL_MARGIN}
        y={0}
        anchor={{ x: 1, y: 0.5 }}
      />

      <pixiText
        text="DRAW NO."
        style={WINNER_LABEL_STYLE}
        x={drawBoxX + drawBoxWidth / 2}
        y={LABEL_OFFSET_Y}
        anchor={{ x: 0.5, y: 0.5 }}
      />

      <pixiGraphics draw={drawDrawBox} />
      <pixiText
        text={currentWinner.drawNumber}
        style={DATE_TIME_VALUE_STYLE}
        x={drawBoxX + CELL_MARGIN}
        y={0}
        anchor={{ x: 0, y: 0.5 }}
      />

      <pixiText
        text="WINNER"
        style={WINNER_LABEL_STYLE}
        x={circleX}
        y={LABEL_OFFSET_Y}
        anchor={{ x: 0.5, y: 0.5 }}
      />

      <pixiGraphics draw={drawCircle} />

      <pixiText
        text={String(currentWinner.winningNumber)}
        style={WINNER_NUMBER_STYLE}
        x={circleX}
        y={0}
        anchor={{ x: 0.5, y: 0.5 }}
      />
    </pixiContainer>
  )
}
