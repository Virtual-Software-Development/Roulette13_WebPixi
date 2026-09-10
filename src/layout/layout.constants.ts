// Resolución de diseño: todo el layout se expresa en estas unidades fijas y
// ResponsiveStage lo escala/centra según el tamaño real de pantalla.
export const DESIGN_WIDTH = 1920
export const DESIGN_HEIGHT = 1080

// Alto real (px de pantalla, NO unidades de diseño) del header DOM
// (src/layout/Header.tsx + header.css), que vive fuera de ResponsiveStage.
// useViewport lo resta del alto disponible para el canvas de Pixi y desplaza
// todo el contenido hacia abajo esa misma cantidad, para que nada quede
// tapado debajo del header. Debe coincidir con la altura fija que usa
// header.css.
export const HEADER_BAR_HEIGHT_PX = 65

export const LAYOUT = {
  footerHeight: 180,
  padding: 15,
  logoBoxSize: 187.5,
}

// Radio compartido por todas las celdas de fila (TIME/DRAW NO./WINNER) —
// antes la celda TIME era un trapecio diagonal.
export const CELL_CORNER_RADIUS = 6

export const TABLE_WIDTH_RATIO = 0.2

// Desplazamiento manual horizontal del cuerpo (LastGame + GameList) sobre el offset base que ya
// aplica SharedLayout -- afinado a mano contra el layout original del viejo panel de estado. El
// offset vertical ya no se afina acá: SharedLayout usa useViewport (visibleTop + LAYOUT.padding),
// el mismo anchor que NumberPanelHotCold/SpinStatsPanel, para que los tres paneles compartan techo
// y piso exactos en vez de un valor fijo aparte que se desalineaba (ver SharedLayout.tsx).
export const BODY_OFFSET_X = 757.5

// Transición Results <-> Video: cuánto dura cada deslizamiento, cuánto se mueven
// los elementos que salen de escena, y cuánto queda el video congelado en su
// último frame antes de volver.
export const TRANSITION_DURATION_MS = 550
export const RESULT_HOLD_MS = 3000
export const SIDE_EXIT_DISTANCE = 550

// Deslizamiento del video de sorteo (RouletteVideoView) y, en sync, de la rueda de fondo que
// sube/baja con él (LobbyBackgroundLayer, ver useDrawCycleStore.videoSlideProgress) --
// deliberadamente más lenta que TRANSITION_DURATION_MS (paneles de Header/Footer/etc., que no
// deben volverse más lentos) para que el movimiento se alcance a percibir bien.
export const VIDEO_WHEEL_TRANSITION_DURATION_MS = 900

// Panel Winner (RouletteVideoView + WinnerPanel): cuánto antes del final del video aparece, y
// cuánto dura su propia animación de escala a 0 al salir (ver WinnerPanel.tsx).
export const WINNER_PANEL_LEAD_SECONDS = 2
export const WINNER_PANEL_EXIT_DURATION_MS = 400

