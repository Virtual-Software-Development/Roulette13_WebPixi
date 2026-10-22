import {
  RESULT_HOLD_MS,
  VIDEO_WHEEL_TRANSITION_DURATION_MS,
  WINNER_PANEL_EXIT_DURATION_MS,
} from '../layout/layout.constants'
import {
  QUICK_MONEY_BLOCK_ENTER_AT_REMAINING_MS,
  QUICK_MONEY_BLOCK_EXIT_AT_REMAINING_MS,
  QUICK_MONEY_DRAW_AT_REMAINING_MS,
  QUICK_MONEY_VIDEO_DURATION_MS,
  QUICK_MONEY_VIDEO_FADE_MS,
} from '../config/quickMoneyLobbyCycle'

// Línea de tiempo ABSOLUTA de un sorteo de Roulette en el lobby, contada desde su hora programada
// (T0 = /gameInfo nextDraw.startTime, igual para todas las máquinas). Antes, después de arrancar el
// video todo se encadenaba a eventos locales ('ended' + hold + bajada), así que cada máquina volvía
// al lobby en un momento distinto según su clip (son aleatorios, de 15.2s a 20.7s) y su carga.
// Ahora cada clip se reproduce a su velocidad normal dentro de una ventana fija y todas las
// máquinas bajan la rueda y vuelven al lobby en el mismo instante.

// Ventana reservada para el clip de resultado: el más largo de la librería mide 20.73s (ffprobe
// sobre los 190 clips de local-media/Videos). Un clip más corto deja el panel Winner más tiempo.
export const ROULETTE_VIDEO_RESERVED_MS = 21_000

// El backend ejecuta el sorteo (resultado + estado en_curso) unos 2s antes de T0
// (quick-money-backend resultRevealLead), así que desde ahí /gameInfo ya anuncia el sorteo siguiente.
export const DRAW_EXECUTION_LEAD_MS = 2_000

// Offsets desde T0.
export const PLAY_START_OFFSET_MS = VIDEO_WHEEL_TRANSITION_DURATION_MS
export const VIDEO_WINDOW_END_OFFSET_MS = PLAY_START_OFFSET_MS + ROULETTE_VIDEO_RESERVED_MS
// active=false: la rueda/video empieza a bajar y el rotor del lobby retoma su giro desde el ángulo 0.
export const RESULT_HOLD_END_OFFSET_MS = VIDEO_WINDOW_END_OFFSET_MS + RESULT_HOLD_MS
// El panel Winner arranca su salida cuando la rueda terminó de bajar.
export const WINNER_EXIT_OFFSET_MS = RESULT_HOLD_END_OFFSET_MS + VIDEO_WHEEL_TRANSITION_DURATION_MS
// Header/Footer/paneles del lobby visibles otra vez.
export const LOBBY_RETURN_OFFSET_MS = WINNER_EXIT_OFFSET_MS + WINNER_PANEL_EXIT_DURATION_MS

// Dónde está un sorteo de Roulette (por su T0) en el instante nowMs:
// - 'video': desde que el backend lo ejecutó hasta el final de la ventana reservada del clip;
// - 'hold': resultado en pantalla (panel Winner) hasta que la rueda empieza a bajar;
// - 'exit': rueda bajando + panel Winner saliendo;
// - 'lobby': antes de su ejecución o después de volver al lobby.
export type RouletteDrawPhase = 'lobby' | 'video' | 'hold' | 'exit'

export function rouletteDrawPhaseAt(nowMs: number, drawStartMs: number): RouletteDrawPhase {
  const sinceStart = nowMs - drawStartMs
  if (sinceStart < -DRAW_EXECUTION_LEAD_MS) return 'lobby'
  if (sinceStart < VIDEO_WINDOW_END_OFFSET_MS) return 'video'
  if (sinceStart < RESULT_HOLD_END_OFFSET_MS) return 'hold'
  if (sinceStart < LOBBY_RETURN_OFFSET_MS) return 'exit'
  return 'lobby'
}

// Fase del rotor de la rueda del lobby (ms dentro de su vuelta) en nowMs. Todas las máquinas lo
// congelan en el ángulo 0 mientras el video está arriba y lo sueltan a la vez en
// T0 + RESULT_HOLD_END_OFFSET_MS, así que la fase es el tiempo desde ese último instante. Sin
// ningún sorteo previo conocido, cualquier ancla compartida sirve: el epoch.
export function rotorPhaseMs(nowMs: number, lastDrawStartMs: number | null, periodMs: number): number {
  const anchor = lastDrawStartMs === null ? 0 : lastDrawStartMs + RESULT_HOLD_END_OFFSET_MS
  return (((nowMs - anchor) % periodMs) + periodMs) % periodMs
}

// --- Quick Money (un sorteo por round de Roulette, ver config/quickMoneyLobbyCycle.ts) ---

// Sorteo de Quick Money del round que termina con el sorteo de Roulette rouletteDrawAtMs.
export function quickMoneyDrawAtMs(rouletteDrawAtMs: number): number {
  return rouletteDrawAtMs - QUICK_MONEY_DRAW_AT_REMAINING_MS
}

// Offsets desde el sorteo de Quick Money (QD): el clip arranca en QD (QuickMoneyPiecesView lo alinea)
// y termina mostrando él mismo los números, así que el fade out y el paso a quickMoneyResult arrancan
// apenas termina, sin hold (pedido explícito).
export const QUICK_MONEY_VIDEO_END_OFFSET_MS = QUICK_MONEY_VIDEO_DURATION_MS
// Resultado publicado en la tabla (después del fade out).
export const QUICK_MONEY_RESULT_OFFSET_MS = QUICK_MONEY_VIDEO_END_OFFSET_MS + QUICK_MONEY_VIDEO_FADE_MS

// --- Resumen del sorteo (WinningTicketsScreen, lo monta DrawSummaryHost) ---
// Se muestra en los huecos del ciclo que ya existen, a la misma hora absoluta en todas las máquinas,
// y arranca en el instante en que termina el sorteo -- tapa la vuelta al lobby, que queda armado
// detrás y se ve recién al cerrarse (antes arrancaba con el lobby ya de vuelta, y se lo veía un
// momento antes de los ganadores):
// - Roulette: desde que termina el hold del panel Winner (la rueda empezaría a bajar) hasta justo
//   antes de que entre el bloque de Quick Money (~47 s en un round de 5:00).
// - Quick Money: desde que termina su video (en vez del fade out al split) hasta justo antes de que
//   salga el bloque (~20 s en un round de 5:00 -- para más, ver docs/backend/draw-summary.md).
// Se cierra DRAW_SUMMARY_EXIT_MARGIN_MS antes de la fase siguiente para que su transición se vea, y si
// el hueco queda por debajo de DRAW_SUMMARY_MIN_MS no se muestra (round más corto, o la máquina llegó
// al final del hueco). El resumen se pide DRAW_SUMMARY_PREFETCH_MS antes de abrir, para que la
// pantalla aparezca a su hora y no cuando responda el backend.
export const DRAW_SUMMARY_EXIT_MARGIN_MS = 1_500
export const DRAW_SUMMARY_MIN_MS = 8_000
export const DRAW_SUMMARY_PREFETCH_MS = 5_000

export interface DrawSummaryWindow {
  startMs: number
  endMs: number
}

function summaryWindow(startMs: number, endMs: number): DrawSummaryWindow | null {
  return endMs - startMs >= DRAW_SUMMARY_MIN_MS ? { startMs, endMs } : null
}

// lastDrawStartMs: T0 del sorteo de Roulette que se resume; nextDrawStartMs: T0 del siguiente.
export function rouletteSummaryWindow(lastDrawStartMs: number, nextDrawStartMs: number): DrawSummaryWindow | null {
  return summaryWindow(
    lastDrawStartMs + RESULT_HOLD_END_OFFSET_MS,
    nextDrawStartMs - QUICK_MONEY_BLOCK_ENTER_AT_REMAINING_MS - DRAW_SUMMARY_EXIT_MARGIN_MS,
  )
}

// quickMoneyDrawMs: hora del sorteo de Quick Money que se resume (el del round que termina con el
// sorteo de Roulette nextDrawStartMs).
export function quickMoneySummaryWindow(quickMoneyDrawMs: number, nextDrawStartMs: number): DrawSummaryWindow | null {
  return summaryWindow(
    quickMoneyDrawMs + QUICK_MONEY_VIDEO_END_OFFSET_MS,
    nextDrawStartMs - QUICK_MONEY_BLOCK_EXIT_AT_REMAINING_MS - DRAW_SUMMARY_EXIT_MARGIN_MS,
  )
}
