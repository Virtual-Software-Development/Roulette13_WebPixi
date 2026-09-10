import { useCallback, useMemo } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'

extend({ Container, Graphics, Text })

const centerAnchor = { x: 0.5, y: 0.5 }

interface InfoIconProps {
  x: number
  y: number
  radius?: number
  color?: number
  strokeWidth?: number
}

// Ícono de información reutilizable (círculo outline + "i" centrada, Graphics+Text) -- nunca el
// carácter unicode "ⓘ" ni un emoji, cuyo render varía por SO/fuente. Compartido por
// NumberPanelHotCold y SpinStatsPanel (ambos paneles usan este mismo ícono en su header/footer).
export function InfoIcon({ x, y, radius = 9, color = 0x9b9fa5, strokeWidth = 1.2 }: InfoIconProps) {
  const glyphStyle = useMemo(
    () => new TextStyle({ fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'italic', fontSize: radius * 1.35, fill: color }),
    [radius, color],
  )

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.circle(0, 0, radius)
      g.stroke({ width: strokeWidth, color })
    },
    [radius, strokeWidth, color],
  )

  return (
    <pixiContainer x={x} y={y}>
      <pixiGraphics draw={draw} />
      <pixiText text="i" style={glyphStyle} anchor={centerAnchor} />
    </pixiContainer>
  )
}
