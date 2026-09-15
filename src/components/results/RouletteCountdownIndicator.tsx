import { useCallback } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Sprite } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { useTexture } from '../../hooks/useTexture'
import { buildMediaUrl } from '../../utils/media'

extend({ Container, Graphics, Sprite })

// Set Website_svg_icons (ver local-media/) -- reemplaza al ícono de ruleta dibujado a mano en el
// centro del indicador.
const CENTER_ICON_URL = buildMediaUrl('Website_svg_icons/03_clock_red_circle.svg')

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

// Indicador decorativo (NO un spinner de loading genérico): un aro de segmentos radiales cortos
// -- como las marcas de un dial de ruleta -- alrededor de un ícono central (Website_svg_icons/03_,
// ver CENTER_ICON_URL). Se redibuja solo cuando cambian `size`/`urgent`/`progress` -- progress
// cambia ~1 vez por segundo (mismo tick que el countdown de texto, ver useCountdown), NO por
// ticker de Pixi, así que sigue sin haber una animación continua por frame, solo un valor que
// avanza a un ritmo real.
export function RouletteCountdownIndicator({ size, progress = 0, urgent = false }: RouletteCountdownIndicatorProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress))
  const { texture: centerIconTexture } = useTexture(CENTER_ICON_URL)

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
    },
    [size, urgent, clampedProgress],
  )

  const iconSize = size * 0.48

  return (
    <pixiContainer>
      <pixiGraphics draw={draw} />
      {centerIconTexture && (
        <pixiSprite
          texture={centerIconTexture}
          x={size / 2}
          y={size / 2}
          width={iconSize}
          height={iconSize}
          anchor={{ x: 0.5, y: 0.5 }}
        />
      )}
    </pixiContainer>
  )
}
