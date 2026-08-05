import { useCallback } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { useTranslation } from 'react-i18next'
import { useResultsStore } from '../../store/useResultsStore'
import { DATE_TIME_VALUE_STYLE, DESIGN_WIDTH } from '../../layout/layout.constants'
import { getRouletteColor, ROULETTE_COLOR_HEX } from '../../utils/rouletteColors'
import {
  createHorizontalGradient,
  DRAW_COLOR_GRADIENTS,
  getOppositeTimeColor,
  GOLD_BORDER_STOPS,
  GOLD_BORDER_WIDTH,
  TIME_COLOR_GRADIENTS,
} from '../../utils/gradients'
import { rightTrapezoidPoints, TIME_BOX_SLANT } from '../../utils/shapes'
import {
  BOX_GAP,
  DRAW_BOX_WIDTH_INSET,
  DRAW_COLUMN_RATIO,
  PADDING_X,
  WINNER_BOX_GAP,
  WINNER_BOX_WIDTH,
  WINNER_CELL_WIDTH,
} from './ResultRow'
import { TABLE_WIDTH_RATIO } from './ResultsTable'

extend({ Container, Graphics, Text })

const CARD_RADIUS = 48
const LABEL_GAP = 18
const WINNER_ROW_CENTER_Y = 110
const LABEL_OFFSET_Y = -(CARD_RADIUS + LABEL_GAP)
const TEXT_PADDING = 30
const TIME_BOX_WIDTH_INSET = 16 // reduce el ancho de la caja TIME
const BOX_HEIGHT = 44 // misma altura para TIME y DRAW NO., más baja que ROW_HEIGHT

const GOLD_BORDER_GRADIENT = createHorizontalGradient(GOLD_BORDER_STOPS)

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
  const { t } = useTranslation()
  const currentWinner = useResultsStore((state) => state.currentWinner)

  const tableWidth = DESIGN_WIDTH * TABLE_WIDTH_RATIO
  const tableX = (DESIGN_WIDTH - tableWidth) / 2

  const drawBoxX = tableWidth * DRAW_COLUMN_RATIO
  const drawBoxWidth =
    ((tableWidth - WINNER_CELL_WIDTH - PADDING_X - BOX_GAP - drawBoxX - DRAW_BOX_WIDTH_INSET) / 2) * 1.3
  const timeBoxWidth = drawBoxX - BOX_GAP - TIME_BOX_WIDTH_INSET

  const winnerBoxX = drawBoxX + drawBoxWidth + WINNER_BOX_GAP
  const circleX = winnerBoxX + WINNER_BOX_WIDTH / 2

  const hex = currentWinner
    ? ROULETTE_COLOR_HEX[getRouletteColor(currentWinner.winningNumber)]
    : 0x1a1a1a
  const timeColor = currentWinner?.timeColor ?? 'red'

  const drawTimeBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.setFillStyle(TIME_COLOR_GRADIENTS[timeColor])
      g.setStrokeStyle({ width: GOLD_BORDER_WIDTH, fill: GOLD_BORDER_GRADIENT })
      g.poly(rightTrapezoidPoints(0, -BOX_HEIGHT / 2, timeBoxWidth, BOX_HEIGHT, TIME_BOX_SLANT))
      g.fill()
      g.stroke()
    },
    [timeBoxWidth, timeColor],
  )

  const drawDrawBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.setFillStyle(DRAW_COLOR_GRADIENTS[getOppositeTimeColor(timeColor)])
      g.setStrokeStyle({ width: GOLD_BORDER_WIDTH, fill: GOLD_BORDER_GRADIENT })
      g.rect(drawBoxX, -BOX_HEIGHT / 2, drawBoxWidth, BOX_HEIGHT)
      g.fill()
      g.stroke()
    },
    [drawBoxX, drawBoxWidth, timeColor],
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
        text={t('results.time')}
        style={WINNER_LABEL_STYLE}
        x={timeBoxWidth / 2}
        y={LABEL_OFFSET_Y}
        anchor={{ x: 0.5, y: 0.5 }}
      />

      <pixiGraphics draw={drawTimeBox} />
      <pixiText
        text={currentWinner.time}
        style={DATE_TIME_VALUE_STYLE}
        x={timeBoxWidth - TEXT_PADDING}
        y={0}
        anchor={{ x: 1, y: 0.5 }}
      />

      <pixiText
        text={t('results.drawNo')}
        style={WINNER_LABEL_STYLE}
        x={drawBoxX + drawBoxWidth / 2}
        y={LABEL_OFFSET_Y}
        anchor={{ x: 0.5, y: 0.5 }}
      />

      <pixiGraphics draw={drawDrawBox} />
      <pixiText
        text={currentWinner.drawNumber}
        style={DATE_TIME_VALUE_STYLE}
        x={drawBoxX + TEXT_PADDING}
        y={0}
        anchor={{ x: 0, y: 0.5 }}
      />

      <pixiText
        text={t('results.winner')}
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
