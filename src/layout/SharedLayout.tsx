import type { ReactNode } from 'react'
import { extend } from '@pixi/react'
import { Container } from 'pixi.js'
import { Background } from './Background'
import { BODY_OFFSET_X, LAYOUT, SIDE_EXIT_DISTANCE, TRANSITION_DURATION_MS } from './layout.constants'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useAnimatedProgress } from '../hooks/useAnimatedProgress'
import { useViewport } from '../hooks/useViewport'
import { easeInOutCubic } from '../utils/easing'

extend({ Container })

interface SharedLayoutProps {
  children?: ReactNode
  // Omite el <Background/> de Pixi (foto+overlay) cuando el fondo ya lo provee una capa de DOM
  // aparte (ver LobbyBackgroundLayer) -- evita que ese fondo opaco tape lo que haya detrás del
  // canvas.
  hideBackground?: boolean
}

export function SharedLayout({ children, hideBackground }: SharedLayoutProps) {
  const lobbyInfoVisible = useDrawCycleStore((state) => state.lobbyInfoVisible)
  const { visibleTop } = useViewport()
  // Mientras el video está en pantalla, el cuerpo de resultados (tarjeta de ganador + tabla) sube
  // y se oculta arriba; vuelve a bajar recién cuando el panel Winner terminó de escalarse a 0
  // (ver useDrawCycleStore.lobbyInfoVisible).
  const progress = useAnimatedProgress(lobbyInfoVisible ? 0 : 1, TRANSITION_DURATION_MS)
  const exitOffset = easeInOutCubic(progress) * SIDE_EXIT_DISTANCE
  const bodyX = BODY_OFFSET_X + exitOffset
  // Antes HEADER_HEIGHT + BODY_OFFSET_Y (112.5, valor fijo heredado del viejo panel de estado in-
  // canvas) -- quedaba ~50px más abajo que el techo de NumberPanelHotCold/SpinStatsPanel (que usan
  // visibleTop + LAYOUT.padding, ver esos componentes), así que aunque ambos lados terminaron con
  // la MISMA altura de panel, sus bottoms no coincidían (pedido explícito: alinear también abajo).
  // Mismo anchor que esos dos paneles ahora, para que los tres compartan techo Y piso.
  const bodyY = visibleTop + LAYOUT.padding

  return (
    <>
      {!hideBackground && <Background />}
      <pixiContainer x={bodyX} y={bodyY}>
        {children}
      </pixiContainer>
    </>
  )
}
