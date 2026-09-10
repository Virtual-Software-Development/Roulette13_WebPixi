import { useCallback } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { getRouletteColor, type RouletteColor } from '../../utils/rouletteColors'
import type { WheelPocket } from '../../types/wheel'

extend({ Container, Graphics, Text })

export const RESULT_BADGE_WIDTH = 44
export const RESULT_BADGE_HEIGHT = 34
const BADGE_CORNER_RADIUS = 3.5
const BADGE_BORDER_WIDTH = 1

// Fondos sólidos de la pill de resultado -- distintos de ROULETTE_TEXT_COLOR_HEX (utils/rouletteColors.ts),
// que resuelve el color del NÚMERO como texto suelto sobre fondo oscuro (uso de GameRow.tsx antes
// de este rediseño); acá el color pinta el fondo entero de una badge opaca, así que necesita su
// propia paleta (más saturada, pensada para texto blanco encima) en vez de reusar esos valores.
const BADGE_BACKGROUND: Record<RouletteColor, number> = {
  green: 0x118c3d,
  red: 0xff171d,
  black: 0x05070a,
}

const BADGE_BORDER: Partial<Record<RouletteColor, number>> = {
  black: 0x3a3f46,
}

const BADGE_TEXT_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 16,
  fill: 0xf5f5f5,
})

interface ResultBadgeProps {
  // WheelPocket (no un number crudo de la API): el caller debe resolver 37->'00' con
  // toWheelPocket() antes de llegar acá (ver GameRow.tsx) -- mismo criterio que WinnerPanel.tsx.
  pocket: WheelPocket
  x: number
  y: number
}

// Fuente única de verdad para red/black/green: getRouletteColor (utils/rouletteColors.ts), la
// misma que ya usan GameRow/WinnerPanel/spinStats -- no se reinterpreta la clasificación acá.
export function ResultBadge({ pocket, x, y }: ResultBadgeProps) {
  const color = getRouletteColor(pocket)

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.roundRect(0, 0, RESULT_BADGE_WIDTH, RESULT_BADGE_HEIGHT, BADGE_CORNER_RADIUS)
      g.fill(BADGE_BACKGROUND[color])
      const borderColor = BADGE_BORDER[color]
      if (borderColor !== undefined) {
        g.setStrokeStyle({ width: BADGE_BORDER_WIDTH, color: borderColor })
        g.stroke()
      }
    },
    [color],
  )

  return (
    <pixiContainer x={x} y={y}>
      <pixiGraphics draw={draw} />
      <pixiText
        text={String(pocket)}
        style={BADGE_TEXT_STYLE}
        x={RESULT_BADGE_WIDTH / 2}
        y={RESULT_BADGE_HEIGHT / 2}
        anchor={{ x: 0.5, y: 0.5 }}
      />
    </pixiContainer>
  )
}
