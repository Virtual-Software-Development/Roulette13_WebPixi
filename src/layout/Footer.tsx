import type { ReactNode } from 'react'
import { useCallback } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { useTranslation } from 'react-i18next'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useTexture } from '../hooks/useTexture'
import { useViewport } from '../hooks/useViewport'
import { useAnimatedProgress } from '../hooks/useAnimatedProgress'
import { easeInOutCubic } from '../utils/easing'
import { DATE_TIME_VALUE_STYLE, LAYOUT, SIDE_EXIT_DISTANCE, TRANSITION_DURATION_MS } from './layout.constants'
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

const LOGO_FALLBACK_CORNER_RADIUS = 8
// El cuadro nominal (logoBoxSize) es más alto que el propio footer — un logo
// real nunca lo nota porque su sprite se escala por aspect ratio, pero el
// fallback dibuja un cuadrado fijo, así que se acota al alto disponible para
// no desbordar el footer (dejando el mismo aire que logoBoxSize/padding).
const LOGO_FALLBACK_SIZE = Math.min(LAYOUT.logoBoxSize, LAYOUT.footerHeight - LAYOUT.padding)

const LOGO_FALLBACK_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 18,
  fill: 0xc9c9d1,
  align: 'center',
  wordWrap: true,
  wordWrapWidth: LOGO_FALLBACK_SIZE - LAYOUT.padding,
})

interface FooterProps {
  children?: ReactNode
}

export function Footer({ children }: FooterProps) {
  const { t } = useTranslation()
  const logoUrl = useGameConfigStore((state) => state.logoUrl)
  const { texture: logoTexture, failed: logoFailed } = useTexture(logoUrl)

  const drawNumber = useGameConfigStore((state) => state.drawNumber)
  const nextDrawTime = useGameConfigStore((state) => state.nextDrawTime)
  const showDrawInfo = useGameConfigStore((state) => state.showDrawInfo)
  const showLogo = useGameConfigStore((state) => state.showLogo)
  const { visibleLeft, visibleRight, visibleBottom } = useViewport()

  const active = useDrawCycleStore((state) => state.active)
  // El logo sale hacia la izquierda y el cuadro de sorteo hacia la derecha
  // mientras el video está en pantalla; vuelven cuando active vuelve a false.
  const progress = useAnimatedProgress(active ? 1 : 0, TRANSITION_DURATION_MS)
  const exitOffset = easeInOutCubic(progress) * SIDE_EXIT_DISTANCE

  const drawBoxWidth = LAYOUT.drawBoxWidth
const drawBoxHeight = LAYOUT.drawBoxHeight
const drawBoxX = visibleRight - LAYOUT.padding - drawBoxWidth + exitOffset
const drawBoxY = LAYOUT.padding

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

  const drawLogoFallback = useCallback((g: PixiGraphics) => {
    g.clear()
    g.setFillStyle({ color: 0x2b2b33, alpha: 0.4 })
    g.setStrokeStyle({ width: 2, color: 0x8a8a96 })
    g.roundRect(0, 0, LOGO_FALLBACK_SIZE, LOGO_FALLBACK_SIZE, LOGO_FALLBACK_CORNER_RADIUS)
    g.fill()
    g.stroke()
  }, [])

  const logoY = (LAYOUT.footerHeight - LOGO_FALLBACK_SIZE) / 2

  return (
    <pixiContainer x={0} y={visibleBottom - LAYOUT.footerHeight}>
      {showLogo && logoTexture && (() => {
        const scale = Math.min(
          LAYOUT.logoBoxSize / logoTexture.width,
          LAYOUT.logoBoxSize / logoTexture.height,
        )
        const logoWidth = logoTexture.width * scale
        const logoHeight = logoTexture.height * scale
        const spriteY = (LAYOUT.footerHeight - logoHeight) / 2

        return (
          <pixiSprite
            texture={logoTexture}
            x={visibleLeft + LAYOUT.padding - exitOffset}
            y={spriteY}
            width={logoWidth}
            height={logoHeight}
          />
        )
      })()}

      {showLogo && !logoTexture && logoFailed && (
        <pixiContainer x={visibleLeft + LAYOUT.padding - exitOffset} y={logoY}>
          <pixiGraphics draw={drawLogoFallback} />
          <pixiText
            text={t('media.logoNotFound')}
            style={LOGO_FALLBACK_LABEL_STYLE}
            x={LOGO_FALLBACK_SIZE / 2}
            y={LOGO_FALLBACK_SIZE / 2}
            anchor={{ x: 0.5, y: 0.5 }}
          />
        </pixiContainer>
      )}

        { showDrawInfo && (
    <pixiContainer x={drawBoxX} y={drawBoxY}>
      <pixiGraphics draw={drawDrawBox} />

      <pixiText
        text={t('footer.draw')}
        style={DRAW_BOX_LABEL_STYLE}
        x={drawBoxWidth / 2}
        y={drawBoxHeight * 0.18}
        anchor={{ x: 0.5, y: 0.5 }}
      />

      <pixiText
        text={drawNumber}
        style={DATE_TIME_VALUE_STYLE}
        x={drawBoxWidth / 2}
        y={drawBoxHeight * 0.5}
        anchor={{ x: 0.5, y: 0.5 }}
      />

      <pixiText
        text={nextDrawTime}
        style={DATE_TIME_VALUE_STYLE}
        x={drawBoxWidth / 2}
        y={drawBoxHeight * 0.82}
        anchor={{ x: 0.5, y: 0.5 }}
      />
    </pixiContainer>
  )}

      {children}
    </pixiContainer>
  )
}
