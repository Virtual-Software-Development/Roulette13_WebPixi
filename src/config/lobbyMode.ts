// Modo del lobby compartido (App.tsx):
// - 'round' (por defecto): el ciclo de siempre, anclado a la ronda de 5:00 de Roulette con un
//   sorteo de Quick Money en medio de cada ronda (config/quickMoneyLobbyCycle.ts).
// - 'rotation' (VITE_LOBBY_MODE=rotation): para el horario nuevo -- Roulette cada 2 h desde las
//   7 am, Quick Money a las 12, 14, 18, 20 y 22 h. Las vistas rotan (Roulette -> Quick Money ->
//   Jackpot) y cada juego fija la suya antes de su sorteo (sync/lobbyRotation.ts). Las horas de
//   los sorteos salen del backend, así que funciona con cualquier horario; con el de 5:00 los
//   sorteos fijan su vista casi todo el tiempo.
// Cuando el horario nuevo quede establecido, 'rotation' pasa a ser el único modo.
export type LobbyMode = 'round' | 'rotation'

export const LOBBY_MODE: LobbyMode = import.meta.env.VITE_LOBBY_MODE === 'rotation' ? 'rotation' : 'round'

// Duración de cada vista en la rotación (pedido explícito). El ciclo (10:00) arranca a hora fija
// (:00, :10, :20...), así todas las máquinas muestran la misma vista.
export const ROTATION_ROULETTE_VIEW_MS = 2 * 60_000
export const ROTATION_QUICK_MONEY_VIEW_MS = 7 * 60_000
export const ROTATION_JACKPOT_VIEW_MS = 60_000

// Antesala: cuánto antes de su sorteo cada juego fija su vista, sin importar la rotación (pedido
// explícito: Roulette 4:00 antes del giro; Quick Money 7:00 antes, pasando por su cierre a las 6:00).
export const ROULETTE_ANTEROOM_MS = 4 * 60_000
export const QUICK_MONEY_ANTEROOM_MS = 7 * 60_000

// Después del sorteo la vista sigue fija hasta terminar su secuencia: Roulette hasta el final del
// resumen de ganadores que sigue al panel Winner; Quick Money desde que termina su video, el
// resultado en la tabla con el resumen de ganadores encima.
export const ROULETTE_SUMMARY_MS = 45_000
export const QUICK_MONEY_RESULT_HOLD_MS = 30_000
