import type { ReactNode } from 'react'
import { extend } from '@pixi/react'
import { Container } from 'pixi.js'
import { useViewport } from '../hooks/useViewport'

extend({ Container })

interface ResponsiveStageProps {
  children: ReactNode
}

export function ResponsiveStage({ children }: ResponsiveStageProps) {
  const { scale, offsetX, offsetY } = useViewport()

  return (
    <pixiContainer x={offsetX} y={offsetY} scale={scale}>
      {children}
    </pixiContainer>
  )
}
