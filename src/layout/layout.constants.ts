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
  drawBoxHeight: 160,
}

// Transición Results <-> Video: cuánto dura cada deslizamiento, cuánto se mueven
// los elementos que salen de escena, y cuánto queda el video congelado en su
// último frame antes de volver.
export const TRANSITION_DURATION_MS = 550
export const RESULT_HOLD_MS = 3000
export const SIDE_EXIT_DISTANCE = 600
export const BODY_EXIT_DISTANCE = DESIGN_HEIGHT

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
