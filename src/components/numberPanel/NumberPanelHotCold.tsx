import { useCallback } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { useTranslation } from 'react-i18next'
import { useViewport } from '../../hooks/useViewport'
import { useAnimatedProgress } from '../../hooks/useAnimatedProgress'
import { HOT_COLD_ENTRY_LIMIT, useHotColdWindow } from '../../hooks/useHotColdWindow'
import { easeInOutCubic } from '../../utils/easing'
import { drawRoundedPanel } from '../../utils/panel'
import { createVerticalGradient, GOLD_BORDER_STOPS, GOLD_BORDER_WIDTH } from '../../utils/gradients'
import { getRouletteColor, type RouletteColor } from '../../utils/rouletteColors'
import type { WheelPocket } from '../../types/wheel'
import { CELL_CORNER_RADIUS, LAYOUT, SIDE_EXIT_DISTANCE, TRANSITION_DURATION_MS } from '../../layout/layout.constants'

extend({ Container, Graphics, Text })

const PANEL_WIDTH = 340
const PANEL_PADDING = 20
const TITLE_HEIGHT = 34
const TITLE_GAP = 10
const HEADER_HEIGHT = 26
const HEADER_GAP = 8
const ROW_HEIGHT = 42
const MAX_ENTRIES = HOT_COLD_ENTRY_LIMIT
const CIRCLE_RADIUS = 16

// Ajuste manual de la posición X de los círculos de número, sumado a la posición base (pegada
// al padding del panel) -- HOT positivo lo mueve hacia la derecha (hacia el centro del panel),
// COLD negativo lo mueve hacia la izquierda (también hacia el centro). Ajustar a mano.
const HOT_NUMBER_OFFSET_X = 5
const COLD_NUMBER_OFFSET_X = -10

const PANEL_HEIGHT =
  PANEL_PADDING * 2 + TITLE_HEIGHT + TITLE_GAP + HEADER_HEIGHT + HEADER_GAP + MAX_ENTRIES * ROW_HEIGHT

const headerY = PANEL_PADDING + TITLE_HEIGHT + TITLE_GAP + HEADER_HEIGHT / 2
const firstRowY = PANEL_PADDING + TITLE_HEIGHT + TITLE_GAP + HEADER_HEIGHT + HEADER_GAP
const rowCenterY = (index: number) => firstRowY + index * ROW_HEIGHT + ROW_HEIGHT / 2

const PANEL_FILL = { color: 0x0d1b33, alpha: 0.55 }
const PANEL_BORDER_GRADIENT = createVerticalGradient(GOLD_BORDER_STOPS)

const TITLE_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 24,
  fill: 0xf0d78c,
  letterSpacing: 1,
})

const HOT_HEADER_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize: 20, fill: 0xf5b942 })
const COLD_HEADER_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize: 20, fill: 0x5ab4f0 })

// Relleno del círculo detrás de cada número -- el color real de la ruleta
// (antes se usaba para el texto; ahora el texto es siempre blanco y el color
// lo lleva el círculo).
const NUMBER_CIRCLE_FILL: Record<RouletteColor, number> = {
  red: 0xd6202b,
  black: 0x2b2b30,
  green: 0x1f7a3d,
}

const NUMBER_TEXT_STYLE = new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize: 19, fill: 0xffffff })

const titleAnchor = { x: 0.5, y: 0.5 }
const leftAnchor = { x: 0, y: 0.5 }
const rightAnchor = { x: 1, y: 0.5 }
const centerAnchor = { x: 0.5, y: 0.5 }

interface NumberChipProps {
  pocket: WheelPocket
  x: number
  y: number
}

// Círculo de color (rojo/negro/verde según la casilla real) con el número en
// blanco centrado encima -- una instancia por número hot/cold.
function NumberChip({ pocket, x, y }: NumberChipProps) {
  const fill = NUMBER_CIRCLE_FILL[getRouletteColor(pocket)]
  const drawCircle = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.circle(0, 0, CIRCLE_RADIUS)
      g.fill(fill)
    },
    [fill],
  )

  return (
    <pixiContainer x={x} y={y}>
      <pixiGraphics draw={drawCircle} />
      <pixiText text={String(pocket)} style={NUMBER_TEXT_STYLE} anchor={centerAnchor} />
    </pixiContainer>
  )
}

export function NumberPanelHotCold() {
  const { t } = useTranslation()
  const { visibleLeft, visibleTop } = useViewport()

  // shouldShow/hot/cold vienen de useHotColdWindow -- misma fuente que usa
  // HotColdNumberChipLayer (ver LobbyBackgroundLayer), así ambos muestran
  // siempre los mismos números durante la misma ventana de la ronda. Sale
  // hacia arriba (no hacia los costados, para no chocar con Header/GameList).
  const { shouldShow, hot, cold } = useHotColdWindow()
  // startAtTarget: si al cargar la página no corresponde mostrarlo (ya se
  // pasó el umbral de la ronda), no debe verse ni un instante antes de
  // deslizarse hacia afuera -- arranca directo en la posición oculta.
  const progress = useAnimatedProgress(shouldShow ? 0 : 1, TRANSITION_DURATION_MS, { startAtTarget: true })
  const exitOffset = easeInOutCubic(progress) * SIDE_EXIT_DISTANCE

  const panelX = visibleLeft + LAYOUT.padding
  const panelY = visibleTop + LAYOUT.padding - exitOffset

  const drawBackground = useCallback((g: PixiGraphics) => {
    g.clear()
    drawRoundedPanel(g, {
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      radius: CELL_CORNER_RADIUS,
      fill: PANEL_FILL,
      borderGradient: PANEL_BORDER_GRADIENT,
      borderWidth: GOLD_BORDER_WIDTH,
    })
  }, [])

  return (
    <pixiContainer x={panelX} y={panelY}>
      <pixiGraphics draw={drawBackground} />

      <pixiText
        text={t('numbers.title')}
        style={TITLE_STYLE}
        x={PANEL_WIDTH / 2}
        y={PANEL_PADDING + TITLE_HEIGHT / 2}
        anchor={titleAnchor}
      />

      <pixiText text={t('numbers.hot')} style={HOT_HEADER_STYLE} x={PANEL_PADDING} y={headerY} anchor={leftAnchor} />
      <pixiText
        text={t('numbers.cold')}
        style={COLD_HEADER_STYLE}
        x={PANEL_WIDTH - PANEL_PADDING}
        y={headerY}
        anchor={rightAnchor}
      />

      {hot.map((pocket, index) => (
        <NumberChip
          key={`hot-${pocket}`}
          pocket={pocket}
          x={PANEL_PADDING + CIRCLE_RADIUS + HOT_NUMBER_OFFSET_X}
          y={rowCenterY(index)}
        />
      ))}

      {cold.map((pocket, index) => (
        <NumberChip
          key={`cold-${pocket}`}
          pocket={pocket}
          x={PANEL_WIDTH - PANEL_PADDING - CIRCLE_RADIUS + COLD_NUMBER_OFFSET_X}
          y={rowCenterY(index)}
        />
      ))}
    </pixiContainer>
  )
}
