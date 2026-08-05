import { TextStyle } from 'pixi.js'

// Resolución de diseño: todo el layout se expresa en estas unidades fijas y
// ResponsiveStage lo escala/centra según el tamaño real de pantalla.
export const DESIGN_WIDTH = 2560
export const DESIGN_HEIGHT = 1440

export const LAYOUT = {
  headerHeight: 160,
  footerHeight: 240,
  padding: 40,
  logoBoxSize: 250,
  drawBoxWidth: 220,
  drawBoxHeight: 140,
}

export const TITLE_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 48,
  fill: 0xffffff,
})

export const DATE_TIME_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 16,
  fill: 0xffffff,
})

export const DATE_TIME_VALUE_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 30,
  fill: 0xffffff,
})
