import { useCallback } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import type { RouletteResult } from '../../types/result'
import { getRouletteColor, ROULETTE_COLOR_HEX } from '../../utils/rouletteColors'

extend({ Container, Graphics, Text })

export const ROW_HEIGHT = 56
export const PADDING_X = 16
export const WINNER_CELL_WIDTH = 90
const WINNER_CELL_HEIGHT = 40
export const DRAW_COLUMN_RATIO = 0.35 // a qué % del ancho arranca la caja "DRAW NO."

export const BOX_GAP = 10 // espacio entre las tres cajas, para que no se vean como una sola barra continua
export const CELL_MARGIN = 14 // margen entre el borde de la caja y su texto

// Colores placeholder: TIME y DRAW NO. usan una imagen de fondo fija por columna
// (no cambian según el resultado, a diferencia de WINNER). Todavía no tenemos los
// PNG reales, así que se dibujan como cajas de color mientras tanto — cuando estén
// los archivos, esto se reemplaza por <pixiSprite texture={...}> con useTexture(url),
// igual que ya hace Footer.tsx con drawImageUrl. Exportadas para que WinnerCard use
// exactamente los mismos colores/márgenes en su propia fila destacada.
export const TIME_BOX_PLACEHOLDER_COLOR = 0x3a1010
export const DRAW_BOX_PLACEHOLDER_COLOR = 0x1a1a1a

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
  const winnerBoxX = width - WINNER_CELL_WIDTH - PADDING_X
  const winnerBoxY = (ROW_HEIGHT - WINNER_CELL_HEIGHT) / 2

  const drawBoxX = width * DRAW_COLUMN_RATIO
  const drawBoxWidth = winnerBoxX - BOX_GAP - drawBoxX

  const timeBoxX = 0
  const timeBoxWidth = drawBoxX - BOX_GAP

  const drawTimeBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.setFillStyle({ color: TIME_BOX_PLACEHOLDER_COLOR })
      g.roundRect(timeBoxX, 0, timeBoxWidth, ROW_HEIGHT, 6)
      g.fill()
    },
    [timeBoxWidth],
  )

  const drawDrawBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.setFillStyle({ color: DRAW_BOX_PLACEHOLDER_COLOR })
      g.roundRect(drawBoxX, 0, drawBoxWidth, ROW_HEIGHT, 6)
      g.fill()
    },
    [drawBoxX, drawBoxWidth],
  )

  const color = getRouletteColor(result.winningNumber)
  const winnerHex = ROULETTE_COLOR_HEX[color]

  const drawWinnerBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.setFillStyle({ color: winnerHex })
      g.roundRect(winnerBoxX, winnerBoxY, WINNER_CELL_WIDTH, WINNER_CELL_HEIGHT, 6)
      g.fill()
    },
    [winnerHex, winnerBoxX, winnerBoxY],
  )

  return (
    <pixiContainer x={0} y={y}>
      <pixiGraphics draw={drawTimeBox} />
      <pixiText
        text={result.time}
        style={ROW_TEXT_STYLE}
        x={timeBoxWidth - CELL_MARGIN}
        y={ROW_HEIGHT / 2}
        anchor={{ x: 1, y: 0.5 }}
      />

      <pixiGraphics draw={drawDrawBox} />
      <pixiText
        text={result.drawNumber}
        style={ROW_TEXT_STYLE}
        x={drawBoxX + CELL_MARGIN}
        y={ROW_HEIGHT / 2}
        anchor={{ x: 0, y: 0.5 }}
      />

      <pixiGraphics draw={drawWinnerBox} />
      <pixiText
        text={String(result.winningNumber)}
        style={ROW_TEXT_STYLE}
        x={winnerBoxX + WINNER_CELL_WIDTH / 2}
        y={winnerBoxY + WINNER_CELL_HEIGHT / 2}
        anchor={{ x: 0.5, y: 0.5 }}
      />
    </pixiContainer>
  )
}
