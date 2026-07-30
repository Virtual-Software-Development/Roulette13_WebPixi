import { useCallback, useRef, useState } from 'react'
import { Application, extend, useTick } from '@pixi/react'
import { Container, Graphics } from 'pixi.js'
import { GlowFilter } from 'pixi-filters'
import type { Graphics as PixiGraphics } from 'pixi.js'

extend({ Container, Graphics })

const RADIUS = 40

// Smoke-test only: re-rendering React on every tick to move the circle is fine here,
// but gameplay animation (wheel/ball) should mutate a ref'd Pixi object directly instead.
function GlowingCircle() {
  const angleRef = useRef(0)
  const [, forceRender] = useState(0)

  useTick((ticker) => {
    angleRef.current += ticker.deltaTime * 0.05
    forceRender((n) => n + 1)
  })

  const draw = useCallback((g: PixiGraphics) => {
    g.clear()
    g.setFillStyle({ color: 0x39ff14 })
    g.circle(0, 0, RADIUS)
    g.fill()
  }, [])

  const glow = useRef(
    new GlowFilter({ color: 0x39ff14, distance: 24, outerStrength: 3, innerStrength: 0.5, quality: 0.3 }),
  ).current

  const x = 200 + Math.cos(angleRef.current) * 120
  const y = 200 + Math.sin(angleRef.current) * 120

  return (
    <pixiContainer x={x} y={y} filters={[glow]}>
      <pixiGraphics draw={draw} />
    </pixiContainer>
  )
}

export function TestCanvas() {
  return (
    <Application width={400} height={400} background={0x0a0a12}>
      <GlowingCircle />
    </Application>
  )
}
