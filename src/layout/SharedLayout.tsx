import type { ReactNode } from 'react'
import { extend } from '@pixi/react'
import { Container } from 'pixi.js'
import { Background } from './Background'
import { Footer } from './Footer'
import { BODY_OFFSET_X, BODY_OFFSET_Y, HEADER_HEIGHT, SIDE_EXIT_DISTANCE, TRANSITION_DURATION_MS } from './layout.constants'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useAnimatedProgress } from '../hooks/useAnimatedProgress'
import { easeInOutCubic } from '../utils/easing'

extend({ Container })

interface SharedLayoutProps {
  children?: ReactNode
  footerContent?: ReactNode
  // Omite el <Background/> de Pixi (foto+overlay) cuando el fondo ya lo provee una capa de DOM
  // aparte (ver LobbyBackgroundLayer) -- evita que ese fondo opaco tape lo que haya detrás del
  // canvas.
  hideBackground?: boolean
}

export function SharedLayout({ children, footerContent, hideBackground }: SharedLayoutProps) {
  const active = useDrawCycleStore((state) => state.active)
  // Mientras el video está en pantalla, el cuerpo de resultados (tarjeta de
  // ganador + tabla) sube y se oculta arriba; vuelve a bajar cuando active
  // vuelve a false.
  const progress = useAnimatedProgress(active ? 1 : 0, TRANSITION_DURATION_MS)
  const exitOffset = easeInOutCubic(progress) * SIDE_EXIT_DISTANCE
  const bodyX = BODY_OFFSET_X + exitOffset
  const bodyY = HEADER_HEIGHT + BODY_OFFSET_Y

  return (
    <>
      {!hideBackground && <Background />}
      <pixiContainer x={bodyX} y={bodyY}>
        {children}
      </pixiContainer>
      <Footer>{footerContent}</Footer>
    </>
  )
}
