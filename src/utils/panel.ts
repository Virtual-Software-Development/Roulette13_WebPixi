import type { FillGradient } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'

type FillInput = Parameters<PixiGraphics['setFillStyle']>[0]

interface RoundedPanelOptions {
  width: number
  height: number
  radius: number
  fill: FillInput
  borderGradient?: FillGradient
  borderWidth?: number
}

// Patrón compartido roundRect + fill + borde dorado, usado por el panel de
// estado (Header) — antes vivía duplicado en cada componente. Para opacidad
// baja se usa el `alpha` del nodo <pixiGraphics> que lo dibuja, no un
// parámetro aquí — así se evita depender de alpha por-stop de gradiente, que
// Pixi no soporta de forma directa.
export function drawRoundedPanel(g: PixiGraphics, opts: RoundedPanelOptions) {
  const { width, height, radius, fill, borderGradient, borderWidth = 0 } = opts

  g.setFillStyle(fill)
  if (borderGradient && borderWidth > 0) {
    g.setStrokeStyle({ width: borderWidth, fill: borderGradient })
  }
  g.roundRect(0, 0, width, height, radius)
  g.fill()
  if (borderGradient && borderWidth > 0) {
    g.stroke()
  }
}
