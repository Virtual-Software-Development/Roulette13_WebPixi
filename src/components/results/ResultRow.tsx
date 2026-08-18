import { useCallback, useRef } from 'react'
import { extend, useTick } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { GlowFilter } from 'pixi-filters'
import type { RouletteResult } from '../../types/result'
import { getRouletteColor, ROULETTE_COLOR_HEX } from '../../utils/rouletteColors'
import {
  createHorizontalGradient,
  DRAW_COLOR_GRADIENTS,
  getOppositeTimeColor,
  GOLD_BORDER_STOPS,
  GOLD_BORDER_WIDTH,
  LIVE_HALO_COLOR,
  TIME_COLOR_GRADIENTS,
} from '../../utils/gradients'
import { drawRoundedPanel } from '../../utils/panel'
import { CELL_CORNER_RADIUS, ROW_WINNER_TEXT_STYLE } from '../../layout/layout.constants'

extend({ Container, Graphics, Text })

export const ROW_HEIGHT = 56
const BOX_HEIGHT = 44 // misma altura para TIME y DRAW NO., más baja que ROW_HEIGHT, centrada en la fila
export const WINNER_BOX_WIDTH = 150 // ancho del chip WINNER — angosto a propósito, más chico que las píldoras de TIME/DRAW NO.
const COLUMN_GUTTER = 32 // aire a cada lado de cada píldora dentro de su tercio de columna, para que los 3 espacios entre columnas queden iguales

// Reparte la fila en 3 tercios iguales (TIME/DRAW NO./WINNER) y centra cada
// celda dentro de su tercio. Tanto las filas históricas como la fila "en
// vivo" (WinnerCard, para posicionar los encabezados) usan esta misma
// función, así quedan siempre alineadas entre sí.
export function getColumnLayout(width: number) {
  const slotWidth = width / 3
  const timeBoxX = COLUMN_GUTTER
  const timeBoxWidth = slotWidth - COLUMN_GUTTER * 2
  const drawBoxX = slotWidth + COLUMN_GUTTER
  const drawBoxWidth = slotWidth - COLUMN_GUTTER * 2
  const winnerCenterX = slotWidth * 2 + slotWidth / 2
  const winnerBoxX = winnerCenterX - WINNER_BOX_WIDTH / 2

  return {
    timeCenterX: slotWidth / 2,
    drawCenterX: slotWidth * 1.5,
    winnerCenterX,
    timeBoxX,
    timeBoxWidth,
    drawBoxX,
    drawBoxWidth,
    winnerBoxX,
  }
}

// Opacidad SOLO del degradado de relleno de TIME/DRAW NO. — el borde dorado
// de la celda siempre se dibuja 100% opaco, sin importar este valor (van en
// llamadas separadas: fill vs stroke). Cambiar este número para probar.
const CELL_FILL_ALPHA = 1

const GOLD_BORDER_GRADIENT = createHorizontalGradient(GOLD_BORDER_STOPS)

// Resplandor dorado real (con blur) alrededor del chip del ganador "en vivo".
// Una sola instancia cacheada a nivel de módulo — el "pulso" de encendido y
// apagado se anima mutando su `alpha` en cada tick (ver useTick más abajo),
// nunca recreando el filtro, para no generar basura de memoria por frame.
const LIVE_GLOW_FILTER = new GlowFilter({
  distance: 24,
  outerStrength: 3,
  innerStrength: 0,
  color: LIVE_HALO_COLOR,
  quality: 0.3,
})

const LIVE_GLOW_PERIOD_MS = 1600
const LIVE_GLOW_MIN_ALPHA = 0.2
const LIVE_GLOW_MAX_ALPHA = 1

const ROW_TEXT_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 22,
  fill: 0xffffff,
})

interface ResultRowProps {
  result: RouletteResult
  y: number
  width: number
  isLive?: boolean
}

export function ResultRow({ result, y, width, isLive = false }: ResultRowProps) {
  const { timeBoxX, timeBoxWidth, drawBoxX, drawBoxWidth, winnerBoxX } = getColumnLayout(width)
  const boxY = (ROW_HEIGHT - BOX_HEIGHT) / 2
  const winnerBoxY = boxY

  const glowElapsedRef = useRef(0)
  useTick((ticker) => {
    if (!isLive) return
    glowElapsedRef.current += ticker.deltaMS
    const phase = (glowElapsedRef.current / LIVE_GLOW_PERIOD_MS) * Math.PI * 2
    const wave = 0.5 + 0.5 * Math.sin(phase)
    LIVE_GLOW_FILTER.alpha = LIVE_GLOW_MIN_ALPHA + (LIVE_GLOW_MAX_ALPHA - LIVE_GLOW_MIN_ALPHA) * wave
  })

  const drawTimeBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      drawRoundedPanel(g, {
        width: timeBoxWidth,
        height: BOX_HEIGHT,
        radius: CELL_CORNER_RADIUS,
        fill: { fill: TIME_COLOR_GRADIENTS[result.timeColor], alpha: CELL_FILL_ALPHA },
        borderGradient: GOLD_BORDER_GRADIENT,
        borderWidth: GOLD_BORDER_WIDTH,
      })
    },
    [timeBoxWidth, result.timeColor],
  )

  const drawDrawBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      drawRoundedPanel(g, {
        width: drawBoxWidth,
        height: BOX_HEIGHT,
        radius: CELL_CORNER_RADIUS,
        fill: { fill: DRAW_COLOR_GRADIENTS[getOppositeTimeColor(result.timeColor)], alpha: CELL_FILL_ALPHA },
        borderGradient: GOLD_BORDER_GRADIENT,
        borderWidth: GOLD_BORDER_WIDTH,
      })
    },
    [drawBoxWidth, result.timeColor],
  )

  const color = getRouletteColor(result.winningNumber)
  const winnerHex = ROULETTE_COLOR_HEX[color]

  const drawWinnerBox = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      drawRoundedPanel(g, {
        width: WINNER_BOX_WIDTH,
        height: BOX_HEIGHT,
        radius: CELL_CORNER_RADIUS,
        fill: winnerHex,
        borderGradient: GOLD_BORDER_GRADIENT,
        borderWidth: GOLD_BORDER_WIDTH,
      })
    },
    [winnerHex],
  )

  return (
    <pixiContainer x={0} y={y}>
      <pixiGraphics draw={drawTimeBox} x={timeBoxX} y={boxY} />
      <pixiText
        text={result.time}
        style={ROW_TEXT_STYLE}
        x={timeBoxX + timeBoxWidth / 2}
        y={ROW_HEIGHT / 2}
        anchor={{ x: 0.5, y: 0.5 }}
      />

      <pixiGraphics draw={drawDrawBox} x={drawBoxX} y={boxY} />
      <pixiText
        text={result.drawNumber}
        style={ROW_TEXT_STYLE}
        x={drawBoxX + drawBoxWidth / 2}
        y={ROW_HEIGHT / 2}
        anchor={{ x: 0.5, y: 0.5 }}
      />

      <pixiGraphics
        draw={drawWinnerBox}
        x={winnerBoxX}
        y={winnerBoxY}
        filters={isLive ? [LIVE_GLOW_FILTER] : undefined}
      />
      <pixiText
        text={String(result.winningNumber)}
        style={ROW_WINNER_TEXT_STYLE}
        x={winnerBoxX + WINNER_BOX_WIDTH / 2}
        y={winnerBoxY + BOX_HEIGHT / 2}
        anchor={{ x: 0.5, y: 0.5 }}
      />
    </pixiContainer>
  )
}
