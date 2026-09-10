import { useCallback } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { GlowFilter } from 'pixi-filters'
import type { RouletteResult } from '../../types/result'
import { useRelativeTime } from '../../hooks/useRelativeTime'
import { toWheelPocket } from '../../utils/rouletteColors'
import { ResultBadge, RESULT_BADGE_WIDTH } from './ResultBadge'

extend({ Container, Graphics, Text })

export const ROW_HEIGHT = 50

const ROW_PADDING_X = 18
const BADGE_COLUMN_CENTER_RATIO = 0.55

const CURRENT_ROW_INSET_X = 8
const CURRENT_ROW_INSET_Y = 1
const CURRENT_ROW_CORNER_RADIUS = 5
const CURRENT_ROW_BORDER_COLOR = 0xff1d24
const CURRENT_ROW_BG_FILL = { color: 0xff171d, alpha: 0.06 }
const CURRENT_ROW_BORDER_WIDTH = 1.5

const ROW_DIVIDER_COLOR = 0x788793
const ROW_DIVIDER_ALPHA = 0.16

// Glow ESTÁTICO (sin pulso/animación) sobre el borde de la fila actual -- a diferencia del glow
// que pulsaba con useTick antes de este rediseño, la referencia solo pide "subtle red outer glow",
// no un latido continuo, así que no hay motivo para seguir gastando un tick por frame acá.
const CURRENT_ROW_GLOW_FILTER = new GlowFilter({
  distance: 10,
  outerStrength: 1.4,
  innerStrength: 0,
  color: CURRENT_ROW_BORDER_COLOR,
  quality: 0.3,
})

const GAME_ROW_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 17,
  fill: 0xe4e4e8,
})

const GAME_ROW_TIME_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 15,
  fill: 0xa7a8ac,
})

interface GameRowProps {
  result: RouletteResult
  y: number
  width: number
  isLive?: boolean
}

export function GameRow({ result, y, width, isLive = false }: GameRowProps) {
  const relativeTime = useRelativeTime(result.timestamp)

  const drawCurrentRowBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      const boxWidth = width - CURRENT_ROW_INSET_X * 2
      const boxHeight = ROW_HEIGHT - CURRENT_ROW_INSET_Y * 2
      g.roundRect(CURRENT_ROW_INSET_X, CURRENT_ROW_INSET_Y, boxWidth, boxHeight, CURRENT_ROW_CORNER_RADIUS)
      g.fill(CURRENT_ROW_BG_FILL)
      g.setStrokeStyle({ width: CURRENT_ROW_BORDER_WIDTH, color: CURRENT_ROW_BORDER_COLOR })
      g.stroke()
    },
    [width],
  )

  const drawDivider = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.rect(0, ROW_HEIGHT - 1, width, 1)
      g.fill({ color: ROW_DIVIDER_COLOR, alpha: ROW_DIVIDER_ALPHA })
    },
    [width],
  )

  const badgeCenterX = width * BADGE_COLUMN_CENTER_RATIO
  const pocket = toWheelPocket(result.winningNumber)

  return (
    <pixiContainer x={0} y={y}>
      {isLive && <pixiGraphics draw={drawCurrentRowBox} filters={[CURRENT_ROW_GLOW_FILTER]} />}
      {!isLive && <pixiGraphics draw={drawDivider} />}

      <pixiText
        text={`GAME: ${result.drawNumber}`}
        style={GAME_ROW_LABEL_STYLE}
        x={ROW_PADDING_X}
        y={ROW_HEIGHT / 2}
        anchor={{ x: 0, y: 0.5 }}
      />

      <ResultBadge pocket={pocket} x={badgeCenterX - RESULT_BADGE_WIDTH / 2} y={(ROW_HEIGHT - 34) / 2} />

      <pixiText
        text={relativeTime}
        style={GAME_ROW_TIME_STYLE}
        x={width - ROW_PADDING_X}
        y={ROW_HEIGHT / 2}
        anchor={{ x: 1, y: 0.5 }}
      />
    </pixiContainer>
  )
}
