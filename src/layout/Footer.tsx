import type { ReactNode } from 'react'
import { extend } from '@pixi/react'
import { Container, Sprite } from 'pixi.js'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useTexture } from '../hooks/useTexture'
import { useScreenSize } from '../hooks/useScreenSize'
import { LAYOUT } from './layout.constants'

extend({ Container, Sprite })

interface FooterProps {
  children?: ReactNode
}

export function Footer({ children }: FooterProps) {
  const logoUrl = useGameConfigStore((state) => state.logoUrl)
  const logoTexture = useTexture(logoUrl)
  const { height } = useScreenSize()

  return (
    <pixiContainer x={0} y={height - LAYOUT.footerHeight}>
      {logoTexture && (() => {
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
      {children}
    </pixiContainer>
  )
}
