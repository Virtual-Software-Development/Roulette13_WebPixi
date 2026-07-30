import type { PixiReactElementProps } from '@pixi/react'
import type { Container, Graphics } from 'pixi.js'

declare module '@pixi/react' {
  interface PixiElements {
    pixiContainer: PixiReactElementProps<typeof Container>
    pixiGraphics: PixiReactElementProps<typeof Graphics>
  }
}
