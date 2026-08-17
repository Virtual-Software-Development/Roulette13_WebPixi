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
}

// Panel de estado único (arriba a la derecha): fusiona FECHA/HORA con el
// próximo sorteo, que antes vivían separados en Header y Footer.
export const STATUS_PANEL_WIDTH = 300
export const STATUS_PANEL_PADDING = 24
export const STATUS_PANEL_CORNER_RADIUS = 8

// Radio compartido por todas las celdas de fila (TIME/DRAW NO./WINNER) —
// antes la celda TIME era un trapecio diagonal.
export const CELL_CORNER_RADIUS = 8

export const TABLE_WIDTH_RATIO = 0.42

// Bloque de encabezados + línea divisoria que WinnerCard dibuja antes de su
// propia fila "en vivo". Se definen aquí (no en WinnerCard.tsx) para que
// ResultsTable.tsx pueda calcular dónde empieza la tabla histórica sin crear
// un import circular entre ambos componentes.
export const WINNER_HEADER_LABEL_HEIGHT = 30
export const WINNER_HEADER_DIVIDER_GAP = 14
export const WINNER_DIVIDER_ROW_GAP = 20
export const WINNER_CARD_HEADER_BLOCK_HEIGHT =
  WINNER_HEADER_LABEL_HEIGHT + WINNER_HEADER_DIVIDER_GAP + WINNER_DIVIDER_ROW_GAP

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
  letterSpacing: 2,
  dropShadow: {
    color: 0x000000,
    alpha: 0.6,
    blur: 4,
    distance: 2,
  },
})

// Label pequeño en mayúscula (FECHA/HORA/SORTEO) dentro del panel de estado
// y encabezados de columna — gris claro con tracking para look "premium".
export const DATE_TIME_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 16,
  fill: 0xc9c9d1,
  letterSpacing: 1.5,
})

export const DATE_TIME_VALUE_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 30,
  fill: 0xffffff,
})

// Hora estimada del próximo sorteo, junto al ícono de reloj — más grande que
// un label pero por debajo de FECHA/HORA/SORTEO (que son el dato principal).
export const NEXT_DRAW_TIME_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 22,
  fill: 0xffffff,
})

// Texto del número ganador: notablemente más grande que HORA/N° SORTEO
// (ROW_TEXT_STYLE, 22px) para que se lea de inmediato como el dato más
// importante de la fila, tanto en el histórico como en la fila "en vivo".
export const ROW_WINNER_TEXT_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 36,
  fill: 0xffffff,
})

