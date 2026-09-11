import type { FillGradient, Graphics as PixiGraphics } from 'pixi.js'

interface DiamondOptions {
  width: number
  height: number
  fill: number | FillGradient
  strokeColor?: number
  strokeWidth?: number
  strokeAlpha?: number
}

// Rombo vectorial (cuadrado rotado 45°, o alargado si width !== height)
// dibujado en una caja width×height, reemplaza al asset de imagen de
// diamante que no existe en el repo.
// El caller hace g.clear() antes, igual que con drawRoundedPanel.
export function drawDiamond(g: PixiGraphics, opts: DiamondOptions) {
  const { width, height, fill, strokeColor, strokeWidth = 0, strokeAlpha = 1 } = opts
  const rw = width / 2
  const rh = height / 2

  if (strokeColor && strokeWidth > 0) {
    g.setStrokeStyle({ width: strokeWidth, color: strokeColor, alpha: strokeAlpha })
  }
  g.moveTo(rw, 0)
  g.lineTo(width, rh)
  g.lineTo(rw, height)
  g.lineTo(0, rh)
  g.closePath()
  g.fill(fill)
  if (strokeColor && strokeWidth > 0) {
    g.stroke()
  }
}
