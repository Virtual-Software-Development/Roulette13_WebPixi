import { useCallback } from 'react'
import { extend } from '@pixi/react'
import { CanvasTextMetrics, Container, Graphics, Text } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { useTranslation } from 'react-i18next'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useClock } from '../hooks/useClock'
import { useViewport } from '../hooks/useViewport'
import { useAnimatedProgress } from '../hooks/useAnimatedProgress'
import { easeInOutCubic } from '../utils/easing'
import {
  DATE_TIME_LABEL_STYLE,
  DATE_TIME_VALUE_STYLE,
  LAYOUT,
  NEXT_DRAW_TIME_STYLE,
  SIDE_EXIT_DISTANCE,
  STATUS_PANEL_CORNER_RADIUS,
  STATUS_PANEL_PADDING,
  STATUS_PANEL_WIDTH,
  TITLE_STYLE,
  TRANSITION_DURATION_MS,
} from './layout.constants'
import { createHorizontalGradient, GOLD_BORDER_STOPS, GOLD_BORDER_WIDTH } from '../utils/gradients'
import { drawRoundedPanel } from '../utils/panel'

extend({ Container, Graphics, Text })

const PANEL_FILL = { color: 0x000000, alpha: 0.55 }
const GOLD_BORDER_GRADIENT = createHorizontalGradient(GOLD_BORDER_STOPS)

const LABEL_LINE_HEIGHT = 20
const VALUE_LINE_HEIGHT = 36
const LABEL_VALUE_GAP = 4
const GROUP_GAP = 12
const DIVIDER_GAP_ABOVE = 12
const DIVIDER_GAP_BELOW = 14
const NEXT_ROW_GAP = 10
const NEXT_ROW_HEIGHT = 30
const CLOCK_ICON_RADIUS = 10
const CLOCK_ICON_GAP = 8

const dateLabelY = STATUS_PANEL_PADDING
const dateValueY = dateLabelY + LABEL_LINE_HEIGHT + LABEL_VALUE_GAP
const timeLabelY = dateValueY + VALUE_LINE_HEIGHT + GROUP_GAP
const timeValueY = timeLabelY + LABEL_LINE_HEIGHT + LABEL_VALUE_GAP
const dividerY = timeValueY + VALUE_LINE_HEIGHT + DIVIDER_GAP_ABOVE
const drawLabelY = dividerY + DIVIDER_GAP_BELOW
const drawValueY = drawLabelY + LABEL_LINE_HEIGHT + LABEL_VALUE_GAP
const nextDrawRowY = drawValueY + VALUE_LINE_HEIGHT + NEXT_ROW_GAP
const PANEL_HEIGHT = nextDrawRowY + NEXT_ROW_HEIGHT + STATUS_PANEL_PADDING

const centerAnchor = { x: 0.5, y: 0 }

function drawClockIcon(g: PixiGraphics) {
  g.clear()
  g.setStrokeStyle({ width: 1.5, color: 0xffffff })
  g.circle(CLOCK_ICON_RADIUS, CLOCK_ICON_RADIUS, CLOCK_ICON_RADIUS)
  g.moveTo(CLOCK_ICON_RADIUS, CLOCK_ICON_RADIUS)
  g.lineTo(CLOCK_ICON_RADIUS, CLOCK_ICON_RADIUS * 0.3)
  g.moveTo(CLOCK_ICON_RADIUS, CLOCK_ICON_RADIUS)
  g.lineTo(CLOCK_ICON_RADIUS * 1.6, CLOCK_ICON_RADIUS)
  g.stroke()
}

export function Header() {
  const { t } = useTranslation()
  const gameName = useGameConfigStore((state) => state.gameName)
  const showTitle = useGameConfigStore((state) => state.showTitle)
  const showDateTime = useGameConfigStore((state) => state.showDateTime)
  const drawNumber = useGameConfigStore((state) => state.drawNumber)
  const nextDrawTime = useGameConfigStore((state) => state.nextDrawTime)
  const showDrawInfo = useGameConfigStore((state) => state.showDrawInfo)
  const { date, time } = useClock()
  const { visibleLeft, visibleTop, visibleRight } = useViewport()

  const active = useDrawCycleStore((state) => state.active)
  // El título sale hacia la izquierda y el panel de estado hacia la derecha
  // mientras el video está en pantalla; vuelven cuando active vuelve a false.
  const progress = useAnimatedProgress(active ? 1 : 0, TRANSITION_DURATION_MS)
  const exitOffset = easeInOutCubic(progress) * SIDE_EXIT_DISTANCE

  const panelX = visibleRight - LAYOUT.padding - STATUS_PANEL_WIDTH + exitOffset
  const panelY = visibleTop + LAYOUT.padding
  const panelCenterX = STATUS_PANEL_WIDTH / 2
  const dividerInset = STATUS_PANEL_PADDING

  // Centra el grupo ícono+hora como un bloque (no cada elemento por separado),
  // midiendo el ancho real del texto para que quede alineado con FECHA/HORA/SORTEO
  // sin importar cuántos caracteres tenga.
  const nextDrawTextWidth = nextDrawTime
    ? CanvasTextMetrics.measureText(nextDrawTime, NEXT_DRAW_TIME_STYLE).width
    : 0
  const nextRowGroupWidth = CLOCK_ICON_RADIUS * 2 + CLOCK_ICON_GAP + nextDrawTextWidth
  const nextRowStartX = panelCenterX - nextRowGroupWidth / 2

  const drawPanel = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      drawRoundedPanel(g, {
        width: STATUS_PANEL_WIDTH,
        height: PANEL_HEIGHT,
        radius: STATUS_PANEL_CORNER_RADIUS,
        fill: PANEL_FILL,
        borderGradient: GOLD_BORDER_GRADIENT,
        borderWidth: GOLD_BORDER_WIDTH,
      })
    },
    [],
  )

  const drawDivider = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.setStrokeStyle({ width: 2, fill: GOLD_BORDER_GRADIENT })
      g.moveTo(dividerInset, dividerY)
      g.lineTo(STATUS_PANEL_WIDTH - dividerInset, dividerY)
      g.stroke()
    },
    [dividerInset],
  )

  const showStatusPanel = showDateTime || showDrawInfo

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

      {showStatusPanel && (
        <pixiContainer x={panelX} y={panelY}>
          <pixiGraphics draw={drawPanel} />

          {showDateTime && (
            <>
              <pixiText text={t('header.date')} style={DATE_TIME_LABEL_STYLE} x={panelCenterX} y={dateLabelY} anchor={centerAnchor} />
              <pixiText text={date} style={DATE_TIME_VALUE_STYLE} x={panelCenterX} y={dateValueY} anchor={centerAnchor} />
              <pixiText text={t('header.time')} style={DATE_TIME_LABEL_STYLE} x={panelCenterX} y={timeLabelY} anchor={centerAnchor} />
              <pixiText text={time} style={DATE_TIME_VALUE_STYLE} x={panelCenterX} y={timeValueY} anchor={centerAnchor} />
            </>
          )}

          {showDateTime && showDrawInfo && <pixiGraphics draw={drawDivider} />}

          {showDrawInfo && (
            <>
              <pixiText text={t('footer.draw')} style={DATE_TIME_LABEL_STYLE} x={panelCenterX} y={drawLabelY} anchor={centerAnchor} />
              <pixiText text={drawNumber} style={DATE_TIME_VALUE_STYLE} x={panelCenterX} y={drawValueY} anchor={centerAnchor} />

              <pixiGraphics
                draw={drawClockIcon}
                x={nextRowStartX}
                y={nextDrawRowY + (NEXT_ROW_HEIGHT - CLOCK_ICON_RADIUS * 2) / 2}
              />
              <pixiText
                text={nextDrawTime}
                style={NEXT_DRAW_TIME_STYLE}
                x={nextRowStartX + CLOCK_ICON_RADIUS * 2 + CLOCK_ICON_GAP}
                y={nextDrawRowY + NEXT_ROW_HEIGHT / 2}
                anchor={{ x: 0, y: 0.5 }}
              />
            </>
          )}
        </pixiContainer>
      )}
    </pixiContainer>
  )
}
