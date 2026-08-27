import { TextStyle } from 'pixi.js'

// Resolución de diseño: todo el layout se expresa en estas unidades fijas y
// ResponsiveStage lo escala/centra según el tamaño real de pantalla.
export const DESIGN_WIDTH = 1920
export const DESIGN_HEIGHT = 1080

export const LAYOUT = {
  footerHeight: 180,
  padding: 30,
  logoBoxSize: 187.5,
}

// Panel de estado único (arriba a la derecha): número de sorteo + countdown
// de la próxima ronda.
export const STATUS_PANEL_WIDTH = 225
export const STATUS_PANEL_PADDING = 18
export const HEADER_ROW_HEIGHT = 30
export const HEADER_ROW_GAP = 12

// Alto real del contenido del panel de Header (2 filas + gap + padding
// simétrico), medido desde el techo de la pantalla -- usado para ubicar lo
// que va justo debajo (ver bodyY en SharedLayout) en vez de un valor fijo
// desacoplado de la geometría real del panel.
export const HEADER_HEIGHT = LAYOUT.padding + STATUS_PANEL_PADDING * 2 + HEADER_ROW_HEIGHT * 2 + HEADER_ROW_GAP

// Separación horizontal entre el grupo de labels y el grupo de values del
// Header. Solo mueve el grupo de labels (hacia la izquierda); values se
// mantiene en valueX.
export const LABEL_VALUE_SPACING = 140

// Radio compartido por todas las celdas de fila (TIME/DRAW NO./WINNER) —
// antes la celda TIME era un trapecio diagonal.
export const CELL_CORNER_RADIUS = 6

export const TABLE_WIDTH_RATIO = 0.18

// Desplazamiento manual del cuerpo (LastGame + GameList) sobre el offset base
// que ya aplica SharedLayout -- valor de partida para X: alinea el borde
// izquierdo de la tabla (que internamente se centra en DESIGN_WIDTH) con el
// borde izquierdo del panel de Header (DESIGN_WIDTH - LAYOUT.padding -
// STATUS_PANEL_WIDTH). Ajustar a mano según se necesite.
export const BODY_OFFSET_X = 757.5
export const BODY_OFFSET_Y = 82.5

// Transición Results <-> Video: cuánto dura cada deslizamiento, cuánto se mueven
// los elementos que salen de escena, y cuánto queda el video congelado en su
// último frame antes de volver.
export const TRANSITION_DURATION_MS = 550
export const RESULT_HOLD_MS = 3000
export const SIDE_EXIT_DISTANCE = 550

// Label "GAME:" + valor del número de sorteo en el panel de estado del Header.
export const HEADER_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 27,
  fill: 0xc9c9d1,
  letterSpacing: 1.125,
})

export const HEADER_GAME_VALUE_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 27,
  fill: 0xffffff,
})

// Countdown "NEXT ROUND MM:SS" — blanco en estado normal, ámbar cuando
// quedan ≤10s (ver useCountdown / URGENT_THRESHOLD_SECONDS). El glow neón se
// aplica aparte vía GlowFilter en Header.tsx (mismo color que el fill).
export const COUNTDOWN_VALUE_STYLE_NORMAL = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 27,
  fill: 0xffffff,
  letterSpacing: 0.75,
  padding: 15,
  dropShadow: {
    alpha: 1,
    blur: 18,         // How far the glow radiates outward
    color: 0xffffff,  // Your glow color (Cyan)
    distance: 0,      // Keep it at 0 so it glows evenly on all sides
  },
  stroke: {
    color: 0xffffff, // Match glow color
    width: 1.5,         // Thickness of the hard edge
    join: 'round',     // 'round' looks organic, 'miter' looks sharp/blocky
    alpha: 0.6
  },
})

export const COUNTDOWN_VALUE_STYLE_URGENT = new TextStyle({
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontSize: 27,
  fill: 0xffc400,
  letterSpacing: 0.75,
  dropShadow: {
    alpha: 0.8,
    blur: 12,         // How far the glow radiates outward
    color: 0xffc400,  // Your glow color (Cyan)
    distance: 0,      // Keep it at 0 so it glows evenly on all sides
  },
  stroke: {
    color: 0xffc400, // Match glow color
    width: 1.5,         // Thickness of the hard edge
    join: 'round',     // 'round' looks organic, 'miter' looks sharp/blocky
    alpha: 0.6
  },
})

