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
import { LAYOUT, SIDE_EXIT_DISTANCE, TRANSITION_DURATION_MS } from './layout.constants'

extend({ Container, Graphics, Sprite, Text })

const LOGO_FALLBACK_CORNER_RADIUS = 6
// El cuadro nominal (logoBoxSize) es más alto que el propio footer — un logo
// real nunca lo nota porque su sprite se escala por aspect ratio, pero el
// fallback dibuja un cuadrado fijo, así que se acota al alto disponible para
// no desbordar el footer (dejando el mismo aire que logoBoxSize/padding).
const LOGO_FALLBACK_SIZE = Math.min(LAYOUT.logoBoxSize, LAYOUT.footerHeight - LAYOUT.padding)

const LOGO_FALLBACK_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 13.5,
  fill: 0xc9c9d1,
  align: 'center',
  wordWrap: true,
  wordWrapWidth: LOGO_FALLBACK_SIZE - LAYOUT.padding,
})

interface FooterProps {
  children?: ReactNode
}

// El próximo sorteo se fusionó con el panel de estado de Header.tsx (arriba
// a la derecha); Footer sólo conserva el logo (abajo a la izquierda), lo que
// deja la esquina inferior derecha libre para la foto de fondo.
export function Footer({ children }: FooterProps) {
  const { t } = useTranslation()
  const logoUrl = useGameConfigStore((state) => state.logoUrl)
  const { texture: logoTexture, failed: logoFailed } = useTexture(logoUrl)
  const showLogo = useGameConfigStore((state) => state.showLogo)
  const { visibleLeft, visibleBottom } = useViewport()

  const lobbyInfoVisible = useDrawCycleStore((state) => state.lobbyInfoVisible)
  // El logo sale hacia la izquierda mientras el video está en pantalla; vuelve recién cuando el
  // panel Winner terminó de escalarse a 0 (ver useDrawCycleStore.lobbyInfoVisible).
  const progress = useAnimatedProgress(lobbyInfoVisible ? 0 : 1, TRANSITION_DURATION_MS)
  const exitOffset = easeInOutCubic(progress) * SIDE_EXIT_DISTANCE

  const drawLogoFallback = useCallback((g: PixiGraphics) => {
    g.clear()
    g.setFillStyle({ color: 0x2b2b33, alpha: 0.4 })
    g.setStrokeStyle({ width: 1.5, color: 0x8a8a96 })
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

      {children}
    </pixiContainer>
  )
}
