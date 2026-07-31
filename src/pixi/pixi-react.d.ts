import type { PixiReactElementProps } from '@pixi/react'
import type { Container, Graphics, Sprite, Text } from 'pixi.js'

declare module '@pixi/react' {
  interface PixiElements {
    pixiContainer: PixiReactElementProps<typeof Container>
    pixiGraphics: PixiReactElementProps<typeof Graphics>
    pixiSprite: PixiReactElementProps<typeof Sprite>
    pixiText: PixiReactElementProps<typeof Text>
  }
}
