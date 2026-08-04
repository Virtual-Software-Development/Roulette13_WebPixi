import type { ReactNode } from 'react'
import { useCallback } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { useTranslation } from 'react-i18next'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useTexture } from '../hooks/useTexture'
import { useScreenSize } from '../hooks/useScreenSize'
import { DATE_TIME_VALUE_STYLE,LAYOUT } from './layout.constants'
import {
  createVerticalGradient,
  DRAW_GRAY_TO_BLACK_STOPS,
  GOLD_BORDER_STOPS,
  GOLD_BORDER_WIDTH,
} from '../utils/gradients'

extend({ Container, Graphics, Sprite, Text })

const DRAW_BOX_CORNER_RADIUS = 12
const DRAW_BOX_FILL_GRADIENT = createVerticalGradient(DRAW_GRAY_TO_BLACK_STOPS)
const DRAW_BOX_BORDER_GRADIENT = createVerticalGradient(GOLD_BORDER_STOPS)

const DRAW_BOX_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 16,
  fill: 0xffffff,
})

interface FooterProps {
  children?: ReactNode
}

export function Footer({ children }: FooterProps) {
  const { t } = useTranslation()
  const logoUrl = useGameConfigStore((state) => state.logoUrl)
  const logoTexture = useTexture(logoUrl)

  const drawNumber = useGameConfigStore((state) => state.drawNumber)
  const nextDrawTime = useGameConfigStore((state) => state.nextDrawTime)
  const showDrawInfo = useGameConfigStore((state) => state.showDrawInfo)
  const showLogo = useGameConfigStore((state) => state.showLogo)

  const { width,height } = useScreenSize()

 const drawBoxWidth = LAYOUT.drawBoxWidth
const drawBoxHeight = LAYOUT.drawBoxHeight
const drawBoxX = width - LAYOUT.padding - drawBoxWidth
const drawBoxY = LAYOUT.padding
const drawBoxBottomSpace = LAYOUT.footerHeight - drawBoxY - drawBoxHeight
const nextDrawTimeY = drawBoxHeight + drawBoxBottomSpace / 2

  const drawDrawBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.setFillStyle(DRAW_BOX_FILL_GRADIENT)
      g.setStrokeStyle({ width: GOLD_BORDER_WIDTH, fill: DRAW_BOX_BORDER_GRADIENT })
      g.roundRect(0, 0, drawBoxWidth, drawBoxHeight, DRAW_BOX_CORNER_RADIUS)
      g.fill()
      g.stroke()
    },
    [drawBoxWidth, drawBoxHeight],
  )



  return (
    <pixiContainer x={0} y={height - LAYOUT.footerHeight}>
      {showLogo && logoTexture && (() => {
        const scale = Math.min(
          LAYOUT.logoBoxSize / logoTexture.width,
          LAYOUT.logoBoxSize / logoTexture.height,
        )
        const logoWidth = logoTexture.width * scale
        const logoHeight = logoTexture.height * scale
        const logoY = (LAYOUT.footerHeight - logoHeight) / 2

        return (
          <pixiSprite
            texture={logoTexture}
            x={LAYOUT.padding}
            y={logoY}
            width={logoWidth}
            height={logoHeight}
          />
        )
      })()}

        { showDrawInfo && (
    <pixiContainer x={drawBoxX} y={drawBoxY}>
      <pixiGraphics draw={drawDrawBox} />

      <pixiText
        text={t('footer.draw')}
        style={DRAW_BOX_LABEL_STYLE}
        x={drawBoxWidth / 2}
        y={drawBoxHeight * 0.2}
        anchor={{ x: 0.5, y: 0.5 }}
      />

      <pixiText
        text={drawNumber}
        style={DATE_TIME_VALUE_STYLE}
        x={drawBoxWidth / 2}
        y={drawBoxHeight * 0.65}
        anchor={{ x: 0.5, y: 0.5 }}
      />

      <pixiText
        text={nextDrawTime}
        style={DATE_TIME_VALUE_STYLE}
        x={drawBoxWidth / 2}
        y={nextDrawTimeY}
        anchor={{ x: 0.5, y: 0.5 }}
      />
    </pixiContainer>
  )}

      {children}
    </pixiContainer>
  )
}
