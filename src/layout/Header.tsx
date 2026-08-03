import { extend } from '@pixi/react'
import { Container, Text } from 'pixi.js'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useClock } from '../hooks/useClock'
import { useScreenSize } from '../hooks/useScreenSize'
import { DATE_TIME_LABEL_STYLE, DATE_TIME_VALUE_STYLE, LAYOUT, TITLE_STYLE } from './layout.constants'

extend({ Container, Text })

const LABEL_TO_VALUE_GAP = 18
const VALUE_HEIGHT = 34
const BLOCK_GAP = 8

export function Header() {
  const gameName = useGameConfigStore((state) => state.gameName)
  const showTitle = useGameConfigStore((state) => state.showTitle)
  const showDateTime = useGameConfigStore((state) => state.showDateTime)
  const { date, time } = useClock()
  const { width } = useScreenSize()

  const rightEdgeX = width - LAYOUT.padding
  const rightAnchor = { x: 1, y: 0 }

  const dateLabelY = LAYOUT.padding
  const dateValueY = dateLabelY + LABEL_TO_VALUE_GAP
  const timeLabelY = dateValueY + VALUE_HEIGHT + BLOCK_GAP
  const timeValueY = timeLabelY + LABEL_TO_VALUE_GAP

  return (
    <pixiContainer>
      {showTitle &&
        <pixiText
        text={gameName}
        style={TITLE_STYLE}
        x={LAYOUT.padding}
        y={LAYOUT.padding}
      />
      }
      
     {showDateTime && (
        <>
          <pixiText
            text="DATE"
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
            text="TIME"
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
