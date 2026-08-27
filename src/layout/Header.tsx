import { extend } from '@pixi/react'
import { Container, Text } from 'pixi.js'
import { GlowFilter } from 'pixi-filters'
import { useTranslation } from 'react-i18next'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useCountdown } from '../hooks/useCountdown'
import { useViewport } from '../hooks/useViewport'
import { useAnimatedProgress } from '../hooks/useAnimatedProgress'
import { easeInOutCubic } from '../utils/easing'
import {
  COUNTDOWN_VALUE_STYLE_NORMAL,
  COUNTDOWN_VALUE_STYLE_URGENT,
  HEADER_GAME_VALUE_STYLE,
  HEADER_LABEL_STYLE,
  HEADER_ROW_GAP,
  HEADER_ROW_HEIGHT,
  LABEL_VALUE_SPACING,
  LAYOUT,
  SIDE_EXIT_DISTANCE,
  STATUS_PANEL_PADDING,
  STATUS_PANEL_WIDTH,
  TRANSITION_DURATION_MS,
} from './layout.constants'

extend({ Container, Text })

const gameRowY = STATUS_PANEL_PADDING + HEADER_ROW_HEIGHT / 2
const nextRoundRowY = STATUS_PANEL_PADDING + HEADER_ROW_HEIGHT + HEADER_ROW_GAP + HEADER_ROW_HEIGHT / 2

const labelAnchor = { x: 1, y: 0.5 }
const valueAnchor = { x: 1, y: 0.5 }

// Halo neón del countdown — mismo color que el fill de cada estado
// (blanco / ámbar), misma técnica que LIVE_GLOW_FILTER en GameRow.tsx.
const COUNTDOWN_GLOW_FILTER_NORMAL = new GlowFilter({
  color: 0xffffff,
  distance: 375,
  outerStrength: 20,
  innerStrength: 0,
  quality: 0.3,
})

const COUNTDOWN_GLOW_FILTER_URGENT = new GlowFilter({
  color: 0xffb800,
  distance: 375,
  outerStrength: 20,
  innerStrength: 0,
  quality: 0.3,
})

export function Header() {
  const { t } = useTranslation()
  const drawNumber = useGameConfigStore((state) => state.drawNumber)
  const nextDrawStartTime = useGameConfigStore((state) => state.nextDrawStartTime)
  const showDrawInfo = useGameConfigStore((state) => state.showDrawInfo)
  const countdown = useCountdown(nextDrawStartTime)
  const { visibleTop, visibleRight } = useViewport()

  const active = useDrawCycleStore((state) => state.active)
  // El panel sale hacia la derecha mientras el video está en pantalla; vuelve
  // cuando active vuelve a false.
  const progress = useAnimatedProgress(active ? 1 : 0, TRANSITION_DURATION_MS)
  const exitOffset = easeInOutCubic(progress) * SIDE_EXIT_DISTANCE

  const panelX = visibleRight - LAYOUT.padding - STATUS_PANEL_WIDTH + exitOffset
  const panelY = visibleTop + LAYOUT.padding
  const valueX = STATUS_PANEL_WIDTH - STATUS_PANEL_PADDING
  const labelX = valueX - LABEL_VALUE_SPACING

  if (!showDrawInfo) return null

  const countdownStyle = countdown.urgent ? COUNTDOWN_VALUE_STYLE_URGENT : COUNTDOWN_VALUE_STYLE_NORMAL
  // const countdownGlowFilter = countdown.urgent ? COUNTDOWN_GLOW_FILTER_URGENT : COUNTDOWN_GLOW_FILTER_NORMAL

  return (
    <pixiContainer x={panelX} y={panelY}>
      <pixiText text={`${t('header.game')}:`} style={HEADER_LABEL_STYLE} x={labelX} y={gameRowY} anchor={labelAnchor} />
      <pixiText text={drawNumber} style={HEADER_GAME_VALUE_STYLE} x={valueX} y={gameRowY} anchor={valueAnchor} />

      <pixiText
        text={`${t('header.nextRound')}:`}
        style={HEADER_LABEL_STYLE}
        x={labelX}
        y={nextRoundRowY}
        anchor={labelAnchor}
      />
      <pixiText
        text={countdown.display}
        style={countdownStyle}
        x={valueX}
        y={nextRoundRowY}
        anchor={valueAnchor}
        // filters={[countdownGlowFilter]}
      />
    </pixiContainer>
  )
}
