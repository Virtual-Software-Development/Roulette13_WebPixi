import { useCallback, useRef, useState } from 'react'
import { extend, useTick } from '@pixi/react'
import { Graphics } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { Background } from '../layout/Background'
import { useViewport } from '../hooks/useViewport'

extend({ Graphics })

const SPINNER_RADIUS = 60
const SPINNER_THICKNESS = 12

export function LoadingView() {
  return (
    <>
      <Background />
      <Spinner />
    </>
  )
}

function Spinner() {
  const { visibleLeft, visibleTop, visibleRight, visibleBottom } = useViewport()
  const angleRef = useRef(0)
  const [, forceRender] = useState(0)

  useTick((ticker) => {
    angleRef.current += ticker.deltaTime * 0.15
    forceRender((n) => n + 1)
  })

  const draw = useCallback((g: PixiGraphics) => {
    g.clear()
    g.setStrokeStyle({ width: SPINNER_THICKNESS, color: 0xffffff, cap: 'round' })
    g.arc(0, 0, SPINNER_RADIUS, 0, Math.PI * 1.5)
    g.stroke()
  }, [])

  const x = (visibleLeft + visibleRight) / 2
  const y = (visibleTop + visibleBottom) / 2

  return <pixiGraphics x={x} y={y} rotation={angleRef.current} draw={draw} />
}
