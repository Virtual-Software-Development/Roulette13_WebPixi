import type { ReactNode } from 'react'
import { extend } from '@pixi/react'
import { Container, Sprite, Text } from 'pixi.js'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useTexture } from '../hooks/useTexture'
import { useScreenSize } from '../hooks/useScreenSize'
import { DATE_TIME_LABEL_STYLE,DATE_TIME_VALUE_STYLE,LAYOUT } from './layout.constants'

extend({ Container, Sprite, Text })

interface FooterProps {
  children?: ReactNode
}

export function Footer({ children }: FooterProps) {
  const logoUrl = useGameConfigStore((state) => state.logoUrl)
  const logoTexture = useTexture(logoUrl)

  const drawImageUrl = useGameConfigStore((state) => state.drawImageUrl)
  const drawNumber = useGameConfigStore((state) => state.drawNumber)
  const nextDrawTime = useGameConfigStore((state) => state.nextDrawTime)
  const showDrawInfo = useGameConfigStore((state) => state.showDrawInfo)
  const showLogo = useGameConfigStore((state) => state.showLogo)
  const drawTexture = useTexture(drawImageUrl)


  const { width,height } = useScreenSize()

 const drawBoxWidth = LAYOUT.drawBoxWidth
const drawBoxHeight = LAYOUT.drawBoxHeight
const drawBoxX = width - LAYOUT.padding - drawBoxWidth
const drawBoxY = LAYOUT.padding
const drawTimeGap = 4 // antes 12, ahora más cerca del cuadro



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

        { showDrawInfo && drawTexture && (
    <pixiContainer x={drawBoxX} y={drawBoxY}>
      <pixiSprite texture={drawTexture} width={drawBoxWidth} height={drawBoxHeight} />

      <pixiText
        text="DRAW"
        style={DATE_TIME_LABEL_STYLE}
        x={drawBoxWidth / 2}
        y={drawBoxHeight * 0.35}
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
        y={drawBoxHeight + drawTimeGap}
        anchor={{ x: 0.5, y: 0 }}
      />
    </pixiContainer>
  )}

      {children}
    </pixiContainer>
  )
}
