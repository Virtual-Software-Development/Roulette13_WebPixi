import { useCallback, useRef } from 'react'
import { extend, useTick } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { GlowFilter } from 'pixi-filters'
import type { RouletteResult } from '../../types/result'
import { useDrawCycleStore } from '../../store/useDrawCycleStore'
import { getRouletteColor, ROULETTE_TEXT_COLOR_HEX, type RouletteColor } from '../../utils/rouletteColors'
import { drawDiamond } from '../../utils/diamond'

extend({ Container, Graphics, Text })

export const ROW_HEIGHT = 42
export const LIVE_ROW_HEIGHT = 72

const ROW_PADDING_X = 37.5
const LIVE_ROW_PADDING_X = 30
const DIAMOND_CENTER_RATIO = 0.72
const LIVE_BOX_CORNER_RADIUS = 9

// Ajuste manual de posición por elemento, sumado a la posición calculada —
// un juego de offsets para las filas del historial y otro para la fila en
// vivo (LastGame), independientes entre sí. Ajustar a mano según se necesite.
const LABEL_OFFSET_X = 30
const LABEL_OFFSET_Y = 0
const DIAMOND_OFFSET_X = -15
const DIAMOND_OFFSET_Y = 0
const VALUE_OFFSET_X = 0
const VALUE_OFFSET_Y = 0

const LIVE_LABEL_OFFSET_X = -5
const LIVE_LABEL_OFFSET_Y = 0
const LIVE_DIAMOND_OFFSET_X = -15
const LIVE_DIAMOND_OFFSET_Y = 0
const LIVE_VALUE_OFFSET_X = 0
const LIVE_VALUE_OFFSET_Y = 0

const DIAMOND_SIZE = 13.5
const DIAMOND_FILL = 0xe8e8ec

const LIVE_DIAMOND_WIDTH = 12
const LIVE_DIAMOND_HEIGHT = 22
const LIVE_DIAMOND_FILL = 0x35a7ff
const LIVE_DIAMOND_STROKE = 0xbfe4ff
const LIVE_DIAMOND_STROKE_WIDTH = 1.5

const LIVE_BOX_FILL = { color: 0x0d1b33, alpha: 0.55 }
const LIVE_BOX_BORDER_COLOR = 0x35a7ff
const LIVE_BOX_BORDER_WIDTH = 2.25

// Halo celeste pulsante compartido entre el diamante y el borde de la caja
// "en vivo" — misma técnica que el glow dorado del chip ganador de antes:
// una sola instancia a nivel de módulo cuya alpha se anima con un seno en
// cada tick, para que ambos elementos respiren en sincronía.
const LIVE_GLOW_FILTER = new GlowFilter({
  distance: 15,
  outerStrength: 3,
  innerStrength: 0,
  color: LIVE_DIAMOND_FILL,
  quality: 0.3,
})

const LIVE_GLOW_PERIOD_MS = 1600
const LIVE_GLOW_MIN_ALPHA = 0.2
const LIVE_GLOW_MAX_ALPHA = 1

const GAME_ROW_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 20,
  fill: 0xdcdce2,
})

const GAME_ROW_LABEL_STYLE_LIVE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 28,
  fill: 0xffffff,
})

function buildNumberStyles(fontSize: number): Record<RouletteColor, TextStyle> {
  return {
    red: new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize, fill: ROULETTE_TEXT_COLOR_HEX.red }),
    black: new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize, fill: ROULETTE_TEXT_COLOR_HEX.black }),
    green: new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontSize, fill: ROULETTE_TEXT_COLOR_HEX.green }),
  }
}

const NUMBER_TEXT_STYLES = buildNumberStyles(22.5)
const LIVE_NUMBER_TEXT_STYLES = buildNumberStyles(38)

interface GameRowProps {
  result: RouletteResult
  y: number
  width: number
  isLive?: boolean
}

export function GameRow({ result, y, width, isLive = false }: GameRowProps) {
  const height = isLive ? LIVE_ROW_HEIGHT : ROW_HEIGHT
  const labelPaddingX = isLive ? LIVE_ROW_PADDING_X : ROW_PADDING_X
  const valuePaddingX = ROW_PADDING_X // mismo inset en toda fila: mantiene alineada la columna del número
  const diamondCenterX = width * DIAMOND_CENTER_RATIO
  const labelOffsetX = isLive ? LIVE_LABEL_OFFSET_X : LABEL_OFFSET_X
  const labelOffsetY = isLive ? LIVE_LABEL_OFFSET_Y : LABEL_OFFSET_Y
  const diamondOffsetX = isLive ? LIVE_DIAMOND_OFFSET_X : DIAMOND_OFFSET_X
  const diamondOffsetY = isLive ? LIVE_DIAMOND_OFFSET_Y : DIAMOND_OFFSET_Y
  const valueOffsetX = isLive ? LIVE_VALUE_OFFSET_X : VALUE_OFFSET_X
  const valueOffsetY = isLive ? LIVE_VALUE_OFFSET_Y : VALUE_OFFSET_Y

  // Mientras el video del sorteo está activo, la fila queda tapada por completo
  // detrás de él — se deja de animar y de aplicar el glow para no gastar GPU
  // en un blur que no se ve.
  const videoActive = useDrawCycleStore((state) => state.active)
  const glowActive = isLive && !videoActive

  const glowElapsedRef = useRef(0)
  useTick((ticker) => {
    if (!glowActive) return
    glowElapsedRef.current += ticker.deltaMS
    const phase = (glowElapsedRef.current / LIVE_GLOW_PERIOD_MS) * Math.PI * 2
    const wave = 0.5 + 0.5 * Math.sin(phase)
    LIVE_GLOW_FILTER.alpha = LIVE_GLOW_MIN_ALPHA + (LIVE_GLOW_MAX_ALPHA - LIVE_GLOW_MIN_ALPHA) * wave
  })

  const drawBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.setFillStyle(LIVE_BOX_FILL)
      g.setStrokeStyle({ width: LIVE_BOX_BORDER_WIDTH, color: LIVE_BOX_BORDER_COLOR })
      g.roundRect(0, 0, width, LIVE_ROW_HEIGHT, LIVE_BOX_CORNER_RADIUS)
      g.fill()
      g.stroke()
    },
    [width],
  )

  const diamondWidth = isLive ? LIVE_DIAMOND_WIDTH : DIAMOND_SIZE
  const diamondHeight = isLive ? LIVE_DIAMOND_HEIGHT : DIAMOND_SIZE
  const drawRowDiamond = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      if (isLive) {
        drawDiamond(g, {
          width: LIVE_DIAMOND_WIDTH,
          height: LIVE_DIAMOND_HEIGHT,
          fill: LIVE_DIAMOND_FILL,
          strokeColor: LIVE_DIAMOND_STROKE,
          strokeWidth: LIVE_DIAMOND_STROKE_WIDTH,
        })
      } else {
        drawDiamond(g, { width: DIAMOND_SIZE, height: DIAMOND_SIZE, fill: DIAMOND_FILL })
      }
    },
    [isLive],
  )

  const color = getRouletteColor(result.winningNumber)
  const labelStyle = isLive ? GAME_ROW_LABEL_STYLE_LIVE : GAME_ROW_LABEL_STYLE
  const numberStyle = (isLive ? LIVE_NUMBER_TEXT_STYLES : NUMBER_TEXT_STYLES)[color]

  return (
    <pixiContainer x={0} y={y}>
      {isLive && <pixiGraphics draw={drawBox} filters={glowActive ? [LIVE_GLOW_FILTER] : undefined} />}

      <pixiText
        text={`GAME: ${result.drawNumber}`}
        style={labelStyle}
        x={labelPaddingX + labelOffsetX}
        y={height / 2 + labelOffsetY}
        anchor={{ x: 0, y: 0.5 }}
      />

      <pixiGraphics
        draw={drawRowDiamond}
        x={diamondCenterX - diamondWidth / 2 + diamondOffsetX}
        y={(height - diamondHeight) / 2 + diamondOffsetY}
        filters={glowActive ? [LIVE_GLOW_FILTER] : undefined}
      />

      <pixiText
        text={String(result.winningNumber)}
        style={numberStyle}
        x={width - valuePaddingX + valueOffsetX}
        y={height / 2 + valueOffsetY}
        anchor={{ x: 1, y: 0.5 }}
      />
    </pixiContainer>
  )
}
