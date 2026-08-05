import { useCallback } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { useScreenSize } from '../../hooks/useScreenSize'
import {
  createHorizontalGradient,
  DRAW_GRAY_TO_BLACK_STOPS,
  GOLD_BORDER_STOPS,
  GOLD_BORDER_WIDTH,
} from '../../utils/gradients'

extend({ Container, Graphics, Text })

const BUTTON_WIDTH = 200
const BUTTON_HEIGHT = 60
const BUTTON_RADIUS = 12
const BUTTON_MARGIN = 24

const BUTTON_FILL_GRADIENT = createHorizontalGradient(DRAW_GRAY_TO_BLACK_STOPS)
const BUTTON_BORDER_GRADIENT = createHorizontalGradient(GOLD_BORDER_STOPS)

const BUTTON_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 24,
  fill: 0xffffff,
})

interface PlayDrawButtonProps {
  onTap?: () => void
}

export function PlayDrawButton({ onTap }: PlayDrawButtonProps) {
  const { width: screenWidth } = useScreenSize()

  const drawButton = useCallback((g: PixiGraphics) => {
    g.clear()
    g.setFillStyle(BUTTON_FILL_GRADIENT)
    g.setStrokeStyle({ width: GOLD_BORDER_WIDTH, fill: BUTTON_BORDER_GRADIENT })
    g.roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_RADIUS)
    g.fill()
    g.stroke()
  }, [])

  return (
    <pixiContainer
      x={screenWidth - BUTTON_WIDTH - BUTTON_MARGIN}
      y={BUTTON_MARGIN}
      eventMode="static"
      cursor="pointer"
      onPointerTap={onTap}
    >
      <pixiGraphics draw={drawButton} />
      <pixiText
        text="PLAY"
        style={BUTTON_LABEL_STYLE}
        x={BUTTON_WIDTH / 2}
        y={BUTTON_HEIGHT / 2}
        anchor={{ x: 0.5, y: 0.5 }}
      />
    </pixiContainer>
  )
}
