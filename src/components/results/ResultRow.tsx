import { useCallback } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import type { RouletteResult } from '../../types/result'
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

extend({ Container, Graphics, Text })

export const ROW_HEIGHT = 56
export const PADDING_X = 16
export const WINNER_CELL_WIDTH = 90
export const DRAW_COLUMN_RATIO = 0.35 // a qué % del ancho arranca la caja "DRAW NO."

export const BOX_GAP = 10 // espacio entre las tres cajas, para que no se vean como una sola barra continua
const TEXT_PADDING = 24 // margen entre el borde de la caja y su texto

const TIME_BOX_WIDTH_INSET = 16 // reduce el ancho de la caja TIME
export const DRAW_BOX_WIDTH_INSET = 70 // reduce el ancho de la caja DRAW NO. (más que TIME)
const BOX_HEIGHT = 44 // misma altura para TIME y DRAW NO., más baja que ROW_HEIGHT, centrada en la fila
export const WINNER_BOX_WIDTH = 150 // ancho del rectángulo WINNER — ajusta este valor para jugar con su tamaño
export const WINNER_BOX_GAP = 30 // separación entre DRAW NO. y WINNER — ajusta este valor para probar otras distancias

const GOLD_BORDER_GRADIENT = createHorizontalGradient(GOLD_BORDER_STOPS)

const ROW_TEXT_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 22,
  fill: 0xffffff,
})

interface ResultRowProps {
  result: RouletteResult
  y: number
  width: number
}

export function ResultRow({ result, y, width }: ResultRowProps) {
  const drawBoxX = width * DRAW_COLUMN_RATIO
  const drawBoxWidth = ((width - WINNER_CELL_WIDTH - PADDING_X - BOX_GAP - drawBoxX - DRAW_BOX_WIDTH_INSET) / 2) * 1.3
  const boxY = (ROW_HEIGHT - BOX_HEIGHT) / 2

  const winnerBoxX = drawBoxX + drawBoxWidth + WINNER_BOX_GAP
  const winnerBoxY = (ROW_HEIGHT - BOX_HEIGHT) / 2

  const timeBoxX = 0
  const timeBoxWidth = drawBoxX - BOX_GAP - TIME_BOX_WIDTH_INSET

  const drawTimeBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.setFillStyle(TIME_COLOR_GRADIENTS[result.timeColor])
      g.setStrokeStyle({ width: GOLD_BORDER_WIDTH, fill: GOLD_BORDER_GRADIENT })
      g.poly(rightTrapezoidPoints(timeBoxX, boxY, timeBoxWidth, BOX_HEIGHT, TIME_BOX_SLANT))
      g.fill()
      g.stroke()
    },
    [timeBoxWidth, boxY, result.timeColor],
  )

  const drawDrawBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.setFillStyle(DRAW_COLOR_GRADIENTS[getOppositeTimeColor(result.timeColor)])
      g.setStrokeStyle({ width: GOLD_BORDER_WIDTH, fill: GOLD_BORDER_GRADIENT })
      g.rect(drawBoxX, boxY, drawBoxWidth, BOX_HEIGHT)
      g.fill()
      g.stroke()
    },
    [drawBoxX, drawBoxWidth, boxY, result.timeColor],
  )

  const color = getRouletteColor(result.winningNumber)
  const winnerHex = ROULETTE_COLOR_HEX[color]

  const drawWinnerBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.setFillStyle({ color: winnerHex })
      g.setStrokeStyle({ width: GOLD_BORDER_WIDTH, fill: GOLD_BORDER_GRADIENT })
      g.rect(winnerBoxX, winnerBoxY, WINNER_BOX_WIDTH, BOX_HEIGHT)
      g.fill()
      g.stroke()
    },
    [winnerHex, winnerBoxX, winnerBoxY],
  )

  return (
    <pixiContainer x={0} y={y}>
      <pixiGraphics draw={drawTimeBox} />
      <pixiText
        text={result.time}
        style={ROW_TEXT_STYLE}
        x={timeBoxWidth - TEXT_PADDING}
        y={ROW_HEIGHT / 2}
        anchor={{ x: 1, y: 0.5 }}
      />

      <pixiGraphics draw={drawDrawBox} />
      <pixiText
        text={result.drawNumber}
        style={ROW_TEXT_STYLE}
        x={drawBoxX + TEXT_PADDING}
        y={ROW_HEIGHT / 2}
        anchor={{ x: 0, y: 0.5 }}
      />

      <pixiGraphics draw={drawWinnerBox} />
      <pixiText
        text={String(result.winningNumber)}
        style={ROW_TEXT_STYLE}
        x={winnerBoxX + WINNER_BOX_WIDTH / 2}
        y={winnerBoxY + BOX_HEIGHT / 2}
        anchor={{ x: 0.5, y: 0.5 }}
      />
    </pixiContainer>
  )
}
