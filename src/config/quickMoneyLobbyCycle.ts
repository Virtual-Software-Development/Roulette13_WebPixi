// Ciclo del lobby principal (App.tsx) -- un solo lobby para Roulette y Quick Money. Cada juego se
// sortea a sus propias horas del día (página Programming del Admin; el backend crea las rondas con
// días de anticipación): la ruleta cada dos horas, Quick Money a las 12, 14, 18, 20 y 22. Nunca se
// superponen -- el backend salta una hora de ruleta que tocaría un sorteo de Quick Money (desde su
// cierre de apuestas hasta 3 minutos después del sorteo). El lobby muestra Roulette a pantalla
// completa y, alrededor de cada sorteo REAL de Quick Money (su hora sale del backend, ver
// sync/quickMoneySchedule.ts), el bloque de Quick Money:
//
//   QD - 0:30  entra el bloque: quickMoneySplit (countdown de 30s)
//   QD         sorteo de Quick Money -> quickMoneyVideo (72.7s) -> quickMoneyResult
//   QD + 1:33.8  sale el bloque: Roulette a pantalla completa otra vez
//
// Si el bloque arranca tarde (p. ej. al recargar la página a mitad de él) se acorta: si no alcanza
// para el video se muestra el resultado directo, y si el sorteo ya pasó entra al resultado del último
// sorteo, sin generar uno nuevo.

// Countdown visible del sorteo de Quick Money desde que entra el split (pedido explícito: 30s, antes
// 10s): el bloque entra esto antes del sorteo.
export const QUICK_MONEY_DRAW_LEAD_MS = 30_000
// Tiempo que debe quedar en el bloque para arrancar el video (fade + clip de ~72s + hold). Si queda
// menos, se salta el video y se publica el resultado directo.
export const QUICK_MONEY_VIDEO_BUDGET_MS = 80_000

// Con cuánta anticipación al sorteo de Quick Money se empieza a preparar (video/quickMoneyDrawVideo.ts):
// los números del sorteo real recién se piden cuando el backend lo ejecuta (~2s antes), esto solo
// arma la espera (y verifica que estén las piezas del video en local-media).
export const QUICK_MONEY_VIDEO_REQUEST_LEAD_MS = 150_000

// Cuánto se espera, pasada la hora del sorteo de Quick Money, a que lleguen sus números (normalmente
// llegan ~2s antes). Mientras, el split queda con el countdown en 0; si no llegan, se muestra el panel
// de video no disponible, que los revela si llegan antes del final. El video arranca adelantado lo
// que se esperó (QuickMoneyPiecesView), así que termina a la misma hora en todas las máquinas.
export const QUICK_MONEY_NUMBERS_WAIT_MS = 8_000

// Si la fase de video empieza más de esto después de la hora del sorteo (máquina que se encendió o
// recargó a mitad del video, o números que llegaron tarde), no se arranca el video a mitad: se muestra
// el panel de video no disponible con los números, que los revela y sale a la misma hora que el video
// en las demás (pedido explícito -- entrar a mitad es lo que más se presta a errores). Por debajo, el
// video arranca adelantado esa diferencia (lo normal: unos cientos de ms).
export const QUICK_MONEY_VIDEO_LATE_JOIN_MS = 3_000

// Duración de la transición Roulette completo <-> split (rueda achicándose a la izquierda + paneles
// de Quick Money entrando) -- compartida por el CSS (vía variable inline).
export const QUICK_MONEY_SPLIT_TRANSITION_MS = 1200
// El bloque sale (arranca la transición de salida) esto después del sorteo de Quick Money: el video
// (72.7s), su fade y ~20s del resultado y el resumen del sorteo -- el mismo bloque que cuando Quick
// Money se sorteaba a mitad de cada round de Roulette. Lo usan useQuickMoneyLobbyCycle y las
// ventanas del resumen del sorteo (sync/lobbyTimeline.ts).
export const QUICK_MONEY_BLOCK_EXIT_AFTER_DRAW_MS = 93_800
export const QUICK_MONEY_VIDEO_FADE_MS = 400

// Duración del video de Quick Money -- siempre la misma: las piezas de local-media/QuickMoney suman
// 1743 frames a 24 fps = 72.62s (ver video/quickMoneyPieces/plan.ts). Toda la secuencia del video se agenda contra esto y
// no contra su 'ended', para que todas las máquinas pasen a quickMoneyResult a la vez (ver
// sync/lobbyTimeline.ts) -- eso también cubre un video que nunca termina (red rota, decode colgado).
// Es además lo que cuenta VideoErrorPanel cuando el video no está. Tiene que entrar en
// QUICK_MONEY_VIDEO_BUDGET_MS (fade + esto + hold).
export const QUICK_MONEY_VIDEO_DURATION_MS = 72_700

// Panel derecho del split (QuickMoneySplitOverlay): rota entre Winning Numbers (hoy + ayer) y Fast
// Payments, con estas duraciones (pedido explícito). Anclado al reloj del servidor, así todas las
// máquinas muestran el mismo panel a la vez.
export const RESULTS_PANEL_WINNING_MS = 15_000
export const RESULTS_PANEL_PAYTABLE_MS = 10_000
// Crossfade entre los dos paneles -- lo usa el CSS vía variable inline.
export const RESULTS_PANEL_FADE_MS = 500

export type ResultsPanelView = 'winning' | 'paytable'

export function resultsPanelViewAt(nowMs: number): ResultsPanelView {
  const cycleMs = RESULTS_PANEL_WINNING_MS + RESULTS_PANEL_PAYTABLE_MS
  return ((nowMs % cycleMs) + cycleMs) % cycleMs < RESULTS_PANEL_WINNING_MS ? 'winning' : 'paytable'
}
