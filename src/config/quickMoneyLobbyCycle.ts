// Ciclo del lobby principal (App.tsx, http://localhost:5173/) -- un solo lobby para Roulette y Quick
// Money, anclado al reloj de Roulette (useGameConfigStore.nextDrawStartTime, que viene del backend).
// Con el round de Roulette en 5:00 (game_schedule_config.intervalo_segundos = 300) hay un sorteo de
// Quick Money por round, también cada 5:00, en MEDIO del round -- separado de los dos sorteos de
// Roulette para que cada juego tenga su momento (pedido explícito):
//
//   0:00  sorteo de Roulette (video + hold + panel Winner)            ~25s
//   0:25  Roulette a pantalla completa (resultados, hot/cold)         ~45s
//   1:10  bloque de Quick Money: quickMoneySplit (countdown de 30s)
//   1:40  sorteo de Quick Money -> quickMoneyVideo -> quickMoneyResult
//   3:15  Roulette a pantalla completa (hot/cold, spin stats)          rouletteFocusMs
//   5:00  sorteo de Roulette ...
//
// Todo se mide como "tiempo que falta para el sorteo de Roulette", así el sorteo de Quick Money
// nunca puede coincidir con el de Roulette. Si el round es más corto que lo previsto el bloque se
// achica: si no alcanza para el video se muestra el resultado directo, y si el sorteo de Quick Money
// ya pasó (p. ej. al recargar la página a mitad del bloque) entra directo al resultado del último
// sorteo, sin generar uno nuevo.

// Sorteo de Quick Money cuando faltan esto para el sorteo de Roulette (3:20 -> 1:40 de un round de
// 5:00).
export const QUICK_MONEY_DRAW_AT_REMAINING_MS = 200_000
// Countdown visible del sorteo de Quick Money desde que entra el split (pedido explícito: 30s, antes
// 10s). Sumado a QUICK_MONEY_DRAW_AT_REMAINING_MS da cuándo entra el bloque: 3:50 antes del sorteo
// de Roulette -- ~45s después de que termina su panel Winner, así nunca se pisan.
export const QUICK_MONEY_DRAW_LEAD_MS = 30_000
// Roulette a pantalla completa al final de cada round. Con 105s los paneles propios de Roulette
// salen completos (hot/cold mientras quedan >70s, spin stats de 70s al sorteo, ver
// useHotColdWindow/useSpinStatsCycle).
export const ROULETTE_FOCUS_MS = 105_000
// Tiempo que debe quedar en el bloque para arrancar el video (fade + clip de ~72s + hold). Si queda
// menos, se salta el video y se publica el resultado directo.
export const QUICK_MONEY_VIDEO_BUDGET_MS = 80_000

// Con cuánta anticipación al sorteo de Quick Money se empieza a preparar (video/quickMoneyDrawVideo.ts):
// los números y el video del sorteo real recién se piden cuando el backend lo ejecuta (~2s antes),
// esto solo arma la espera.
export const QUICK_MONEY_VIDEO_REQUEST_LEAD_MS = 150_000

// Cuánto se espera, pasada la hora del sorteo de Quick Money, a que termine de bajar su video (el
// backend lo entrega recién ejecutado el sorteo). Mientras, el split queda con el countdown en 0; si
// no llega, se muestra el panel de video no disponible con los mismos números. Un video que llega
// tarde arranca adelantado esa diferencia (QuickMoneyVideoView), así que termina a la misma hora en
// todas las máquinas.
export const QUICK_MONEY_VIDEO_WAIT_MS = 8_000

// Duración de la transición Roulette completo <-> split (rueda achicándose a la izquierda + paneles
// de Quick Money entrando) -- compartida por el CSS (vía variable inline) y por el cálculo del final
// del bloque: la salida arranca esto antes de ROULETTE_FOCUS_MS, así al llegar ahí ya se ve solo
// Roulette.
export const QUICK_MONEY_SPLIT_TRANSITION_MS = 1200
// El bloque de Quick Money entra cuando al round de Roulette le queda esto (countdown de
// QUICK_MONEY_DRAW_LEAD_MS) y sale cuando le queda esto otro -- la transición de salida arranca ahí,
// así a ROULETTE_FOCUS_MS la pantalla ya es 100% Roulette. Los usan useQuickMoneyLobbyCycle y las
// ventanas del resumen del sorteo (sync/lobbyTimeline.ts).
export const QUICK_MONEY_BLOCK_ENTER_AT_REMAINING_MS = QUICK_MONEY_DRAW_AT_REMAINING_MS + QUICK_MONEY_DRAW_LEAD_MS
export const QUICK_MONEY_BLOCK_EXIT_AT_REMAINING_MS = ROULETTE_FOCUS_MS + QUICK_MONEY_SPLIT_TRANSITION_MS
export const QUICK_MONEY_VIDEO_FADE_MS = 400

// Duración de un round de Roulette si todavía no llegó /gameInfo (roundInterval) -- solo para
// estimar el sorteo de Quick Money del round SIGUIENTE (pedido del video y countdown "Next Draw").
export const FALLBACK_ROULETTE_ROUND_MS = 300_000

// Duración del video de Quick Money -- siempre la misma (sorteo-api renderiza la misma plantilla:
// 72.62s medido con ffprobe sobre los renders). Toda la secuencia del video se agenda contra esto y
// no contra su 'ended', para que todas las máquinas pasen a quickMoneyResult a la vez (ver
// sync/lobbyTimeline.ts) -- eso también cubre un video que nunca termina (red rota, decode colgado).
// Es además lo que cuenta VideoErrorPanel cuando el video no está. Tiene que entrar en
// QUICK_MONEY_VIDEO_BUDGET_MS (fade + esto + hold).
export const QUICK_MONEY_VIDEO_DURATION_MS = 72_700
