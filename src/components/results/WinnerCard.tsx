import { useCallback } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { useTranslation } from 'react-i18next'
import { useResultsStore } from '../../store/useResultsStore'
import {
  DESIGN_WIDTH,
  TABLE_WIDTH_RATIO,
  WINNER_DIVIDER_ROW_GAP,
  WINNER_HEADER_DIVIDER_GAP,
  WINNER_HEADER_LABEL_HEIGHT,
} from '../../layout/layout.constants'
import { createHorizontalGradient, GOLD_BORDER_STOPS } from '../../utils/gradients'
import { getColumnLayout, ResultRow } from './ResultRow'

extend({ Container, Graphics, Text })

const HEADER_TOP_Y = 0

const GOLD_BORDER_GRADIENT = createHorizontalGradient(GOLD_BORDER_STOPS)

// Encabezados de columna: mayúscula, bold, con tracking para look premium.
const COLUMN_HEADER_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 26,
  fill: 0xffffff,
  letterSpacing: 1.5,
})

export function WinnerCard() {
  const { t } = useTranslation()
  const currentWinner = useResultsStore((state) => state.currentWinner)

  const tableWidth = DESIGN_WIDTH * TABLE_WIDTH_RATIO
  const tableX = (DESIGN_WIDTH - tableWidth) / 2

  const { timeCenterX, drawCenterX, winnerCenterX } = getColumnLayout(tableWidth)

  const dividerY = HEADER_TOP_Y + WINNER_HEADER_LABEL_HEIGHT + WINNER_HEADER_DIVIDER_GAP
  const rowY = dividerY + WINNER_DIVIDER_ROW_GAP

  const drawDivider = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.setStrokeStyle({ width: 2, fill: GOLD_BORDER_GRADIENT })
      g.moveTo(0, dividerY)
      g.lineTo(tableWidth, dividerY)
      g.stroke()
    },
    [tableWidth, dividerY],
  )

  if (!currentWinner) return null

  return (
    <pixiContainer x={tableX} y={0}>
      <pixiText
        text={t('results.time')}
        style={COLUMN_HEADER_STYLE}
        x={timeCenterX}
        y={HEADER_TOP_Y}
        anchor={{ x: 0.5, y: 0 }}
      />
      <pixiText
        text={t('results.drawNo')}
        style={COLUMN_HEADER_STYLE}
        x={drawCenterX}
        y={HEADER_TOP_Y}
        anchor={{ x: 0.5, y: 0 }}
      />
      <pixiText
        text={t('results.winner')}
        style={COLUMN_HEADER_STYLE}
        x={winnerCenterX}
        y={HEADER_TOP_Y}
        anchor={{ x: 0.5, y: 0 }}
      />

      <pixiGraphics draw={drawDivider} />

      <ResultRow result={currentWinner} width={tableWidth} y={rowY} isLive />
    </pixiContainer>
  )
}
