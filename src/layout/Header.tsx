import { extend } from '@pixi/react'
import { Container, Text } from 'pixi.js'
import { useTranslation } from 'react-i18next'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useClock } from '../hooks/useClock'
import { useViewport } from '../hooks/useViewport'
import { useAnimatedProgress } from '../hooks/useAnimatedProgress'
import { easeInOutCubic } from '../utils/easing'
import { DATE_TIME_LABEL_STYLE, DATE_TIME_VALUE_STYLE, LAYOUT, SIDE_EXIT_DISTANCE, TITLE_STYLE, TRANSITION_DURATION_MS } from './layout.constants'

extend({ Container, Text })

const LABEL_TO_VALUE_GAP = 18
const VALUE_HEIGHT = 34
const BLOCK_GAP = 8

export function Header() {
  const { t } = useTranslation()
  const gameName = useGameConfigStore((state) => state.gameName)
  const showTitle = useGameConfigStore((state) => state.showTitle)
  const showDateTime = useGameConfigStore((state) => state.showDateTime)
  const { date, time } = useClock()
  const { visibleLeft, visibleTop, visibleRight } = useViewport()

  const active = useDrawCycleStore((state) => state.active)
  // El título sale hacia la izquierda y el bloque de fecha/hora hacia la derecha
  // mientras el video está en pantalla; vuelven cuando active vuelve a false.
  const progress = useAnimatedProgress(active ? 1 : 0, TRANSITION_DURATION_MS)
  const exitOffset = easeInOutCubic(progress) * SIDE_EXIT_DISTANCE

  const rightEdgeX = visibleRight - LAYOUT.padding + exitOffset
  const rightAnchor = { x: 1, y: 0 }

  const dateLabelY = visibleTop + LAYOUT.padding
  const dateValueY = dateLabelY + LABEL_TO_VALUE_GAP
  const timeLabelY = dateValueY + VALUE_HEIGHT + BLOCK_GAP
  const timeValueY = timeLabelY + LABEL_TO_VALUE_GAP

  return (
    <pixiContainer>
      {showTitle &&
        <pixiText
        text={gameName}
        style={TITLE_STYLE}
        x={visibleLeft + LAYOUT.padding - exitOffset}
        y={visibleTop + LAYOUT.padding}
      />
      }

     {showDateTime && (
        <>
          <pixiText
            text={t('header.date')}
            style={DATE_TIME_LABEL_STYLE}
            x={rightEdgeX}
            y={dateLabelY}
            anchor={rightAnchor}
          />

          <pixiText
            text={date}
            style={DATE_TIME_VALUE_STYLE}
            x={rightEdgeX}
            y={dateValueY}
            anchor={rightAnchor}
          />

          <pixiText
            text={t('header.time')}
            style={DATE_TIME_LABEL_STYLE}
            x={rightEdgeX}
            y={timeLabelY}
            anchor={rightAnchor}
          />

          <pixiText
            text={time}
            style={DATE_TIME_VALUE_STYLE}
            x={rightEdgeX}
            y={timeValueY}
            anchor={rightAnchor}
          />
        </>
      )}

    </pixiContainer>
  )
}
