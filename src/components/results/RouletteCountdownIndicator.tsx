import { useCallback } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'

extend({ Container, Graphics })

const SEGMENT_COUNT = 28
const GAP_FRACTION = 0.24

interface RouletteCountdownIndicatorProps {
  size: number
  // 0..1 -- cuánto pasó del ciclo actual hasta la próxima ronda (ver LastGame.tsx: se deriva de
  // useCountdown.remainingSeconds contra la duración máxima observada del ciclo). Los segmentos se
  // van "llenando" en sentido horario a medida que avanza, como una barra de carga circular.
  progress?: number
  urgent?: boolean
}

const CENTER_ICON_SPOKE_COUNT = 8
const CENTER_ICON_COLOR = 0xffffff

// Indicador decorativo (NO un spinner de loading genérico): un aro de segmentos radiales cortos
// -- como las marcas de un dial de ruleta -- alrededor de un pequeño ícono de ruleta central, fijo
// y blanco (sin cuello/aguja, sin animación propia). 100% procedural (sin importar una imagen). Se
// redibuja solo cuando cambian `size`/`urgent`/`progress` -- progress cambia ~1 vez por segundo
// (mismo tick que el countdown de texto, ver useCountdown), NO por ticker de Pixi, así que sigue
// sin haber una animación continua por frame, solo un valor que avanza a un ritmo real.
export function RouletteCountdownIndicator({ size, progress = 0, urgent = false }: RouletteCountdownIndicatorProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress))

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      const cx = size / 2
      const cy = size / 2
      const outerRingRadius = size / 2 - 1.5
      const segmentOuterRadius = outerRingRadius - 3
      const segmentInnerRadius = segmentOuterRadius - size * 0.14

      const ringColor = urgent ? 0x7a1f26 : 0x4a1418
      const segmentColorFilled = urgent ? 0xff4d52 : 0xff2027
      const segmentColorEmpty = urgent ? 0x5a1216 : 0x33141a

      // 1. aro exterior fino
      g.circle(cx, cy, outerRingRadius)
      g.stroke({ width: 1.5, color: ringColor })

      // 2. segmentos radiales -- se van "llenando" en sentido horario desde las 12 según progress
      const filledCount = Math.round(clampedProgress * SEGMENT_COUNT)
      const anglePerSlot = (Math.PI * 2) / SEGMENT_COUNT
      const segmentAngle = anglePerSlot * (1 - GAP_FRACTION)
      for (let i = 0; i < SEGMENT_COUNT; i++) {
        const center = i * anglePerSlot - Math.PI / 2
        const a0 = center - segmentAngle / 2
        const a1 = center + segmentAngle / 2
        g.poly([
          cx + segmentInnerRadius * Math.cos(a0), cy + segmentInnerRadius * Math.sin(a0),
          cx + segmentOuterRadius * Math.cos(a0), cy + segmentOuterRadius * Math.sin(a0),
          cx + segmentOuterRadius * Math.cos(a1), cy + segmentOuterRadius * Math.sin(a1),
          cx + segmentInnerRadius * Math.cos(a1), cy + segmentInnerRadius * Math.sin(a1),
        ])
        g.fill(i < filledCount ? segmentColorFilled : segmentColorEmpty)
      }

      // 3. ícono de ruleta central -- circulo exterior + hub interior + rayos, blanco, estático
      // (mismo lenguaje visual que RouletteTabIcon en Header.tsx, pero dibujado con Graphics en vez
      // de SVG porque acá vive dentro del canvas de Pixi).
      const iconRadius = size * 0.24
      const iconHubRadius = size * 0.07
      const iconStrokeWidth = Math.max(1, size * 0.016)

      g.circle(cx, cy, iconRadius)
      g.stroke({ width: iconStrokeWidth, color: CENTER_ICON_COLOR })

      g.circle(cx, cy, iconHubRadius)
      g.stroke({ width: iconStrokeWidth, color: CENTER_ICON_COLOR })

      for (let i = 0; i < CENTER_ICON_SPOKE_COUNT; i++) {
        const angle = (i / CENTER_ICON_SPOKE_COUNT) * Math.PI * 2
        g.moveTo(cx + iconHubRadius * Math.cos(angle), cy + iconHubRadius * Math.sin(angle))
        g.lineTo(cx + iconRadius * Math.cos(angle), cy + iconRadius * Math.sin(angle))
        g.stroke({ width: iconStrokeWidth, color: CENTER_ICON_COLOR })
      }
    },
    [size, urgent, clampedProgress],
  )

  return <pixiGraphics draw={draw} />
}
