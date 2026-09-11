import type { FillGradient, Graphics as PixiGraphics } from 'pixi.js'

interface CornerRadii {
  topLeft?: number
  topRight?: number
  bottomRight?: number
  bottomLeft?: number
}

interface RoundedPanelOptions {
  x?: number
  y?: number
  width: number
  height: number
  // Radio por defecto para las 4 esquinas -- `corners` pisa esquinas puntuales (ej: solo redondear
  // arriba en LastGame, solo abajo en GameList, para que ambos paneles se vean como una única
  // tarjeta continua).
  radius?: number
  corners?: CornerRadii
  fill?: number | FillGradient | { color: number; alpha?: number }
  strokeColor?: number
  strokeWidth?: number
  strokeAlpha?: number
}

// Rectángulo con radio de esquina independiente por vértice -- Graphics.roundRect() de Pixi solo
// admite un radio uniforme para las 4 esquinas, así que se arma a mano con roundShape() (cada
// punto acepta su propio `radius`, ver RoundedPoint en pixi.js) en vez de duplicar geometría con
// moveTo/arcTo por esquina.
export function drawRoundedPanel(g: PixiGraphics, opts: RoundedPanelOptions) {
  const { x = 0, y = 0, width, height, radius = 0, corners = {}, fill, strokeColor, strokeWidth = 0, strokeAlpha = 1 } = opts

  const points = [
    { x, y, radius: corners.topLeft ?? radius },
    { x: x + width, y, radius: corners.topRight ?? radius },
    { x: x + width, y: y + height, radius: corners.bottomRight ?? radius },
    { x, y: y + height, radius: corners.bottomLeft ?? radius },
  ]

  g.roundShape(points, radius)
  g.closePath()

  if (fill !== undefined) g.fill(fill)
  if (strokeColor !== undefined && strokeWidth > 0) {
    g.setStrokeStyle({ width: strokeWidth, color: strokeColor, alpha: strokeAlpha })
    g.stroke()
  }
}
