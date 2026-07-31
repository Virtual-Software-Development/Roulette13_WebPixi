import type { ReactNode } from 'react'
import { Application, extend } from '@pixi/react'
import { Container } from 'pixi.js'
import { Background } from './Background'
import { Header } from './Header'
import { Footer } from './Footer'
import { LAYOUT } from './layout.constants'

extend({ Container })

interface SharedLayoutProps {
  children?: ReactNode
  footerContent?: ReactNode
}

export function SharedLayout({ children, footerContent }: SharedLayoutProps) {
  return (
    <Application
      autoDensity={true}
      resizeTo={window}
      resolution={window.devicePixelRatio || 1}
      background={0x000000}
    >
      <Background />
      <Header />
      <pixiContainer x={0} y={LAYOUT.headerHeight}>
        {children}
      </pixiContainer>
      <Footer>{footerContent}</Footer>
    </Application>
  )
}
