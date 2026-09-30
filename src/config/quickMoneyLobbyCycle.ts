import { buildMediaUrl } from '../utils/media'

// Ciclo del lobby principal (App.tsx, http://localhost:5173/) -- un solo lobby para Roulette y Quick
// Money, anclado al reloj de Roulette (useGameConfigStore.nextDrawStartTime, que viene del backend).
// Cada round de Roulette se reparte así:
//
//   sorteo de Roulette (video + hold + panel Winner, sin cambios)
//   -> bloque de Quick Money: quickMoneySplit (countdown drawLeadMs) -> quickMoneyVideo
//      -> quickMoneyResult (hasta el final del bloque)
//   -> Roulette a pantalla completa los últimos rouletteFocusMs del round
//
// Como el sorteo de Quick Money se agenda DENTRO del bloque (no con un reloj propio), nunca puede
// coincidir con el sorteo de Roulette. Si el round es corto el bloque se achica: si no alcanza para
// el video se muestra el resultado directo, y si no alcanza ni para minBlockMs (p. ej. al recargar
// la página en el tramo final del bloque) entra directo al resultado del último sorteo, sin generar
// uno nuevo -- solo con menos de ~5s de bloque el round queda 100% Roulette.
interface LobbyCycleProfile {
  // Roulette a pantalla completa al final de cada round.
  rouletteFocusMs: number
  // Countdown visible del sorteo de Quick Money desde que entra el split.
  drawLeadMs: number
  // Tiempo que debe quedar en el bloque para arrancar el video (fade + clip + hold). Si queda menos,
  // se salta el video y se publica el resultado directo.
  videoBudgetMs: number
  // Cuánto queda el último frame del video de Quick Money antes del fade out.
  videoHoldMs: number
  // Bloque mínimo que vale la pena mostrar -- por debajo de esto el round queda solo Roulette.
  minBlockMs: number
}

const LOBBY_CYCLE_PROFILES = {
  // Recomendado para producción: round de Roulette de 3:00 (~25s de sorteo, ~65s de Quick Money,
  // 90s de Roulette). Con 90s de foco los paneles propios de Roulette salen completos (hot/cold
  // mientras quedan >70s, spin stats de 70s a 5s, ver useHotColdWindow/useSpinStatsCycle).
  production: {
    rouletteFocusMs: 90_000,
    drawLeadMs: 10_000,
    videoBudgetMs: 25_000,
    videoHoldMs: 3_000,
    minBlockMs: 15_000,
  },
  // PRUEBAS con los rounds actuales del backend (60s): el lobby entre sorteos dura ~33s, así que
  // todo va comprimido para que en CADA round se vean todas las transiciones -- split (~3s),
  // video de Quick Money (placeholder de 16s), resultado (~5s) y vuelta a Roulette (~5s). Los
  // paneles propios de Roulette (hot/cold, spin stats) casi no llegan a verse con este perfil.
  test: {
    rouletteFocusMs: 5_000,
    drawLeadMs: 3_000,
    videoBudgetMs: 19_000,
    videoHoldMs: 1_500,
    minBlockMs: 8_000,
  },
} satisfies Record<string, LobbyCycleProfile>

// 'production' con el round de Roulette del backend en 3:00 (game_schedule_config.intervalo_segundos
// = 180). Volver a 'test' solo si el backend vuelve a rounds de 60s.
const ACTIVE_PROFILE: keyof typeof LOBBY_CYCLE_PROFILES = 'production'

export const {
  rouletteFocusMs: ROULETTE_FOCUS_MS,
  drawLeadMs: QUICK_MONEY_DRAW_LEAD_MS,
  videoBudgetMs: QUICK_MONEY_VIDEO_BUDGET_MS,
  videoHoldMs: QUICK_MONEY_VIDEO_HOLD_MS,
  minBlockMs: QUICK_MONEY_MIN_BLOCK_MS,
}: LobbyCycleProfile = LOBBY_CYCLE_PROFILES[ACTIVE_PROFILE]

// Duración de la transición Roulette completo <-> split (rueda achicándose a la izquierda + paneles
// de Quick Money entrando) -- compartida por el CSS (vía variable inline) y por el cálculo del final
// del bloque: la salida arranca esto antes de ROULETTE_FOCUS_MS, así al llegar ahí ya se ve solo
// Roulette.
export const QUICK_MONEY_SPLIT_TRANSITION_MS = 1200
export const QUICK_MONEY_VIDEO_FADE_MS = 400

// Estimación de cuánto dura el sorteo de Roulette (video + hold + Winner) -- solo para el countdown
// "Next Draw" de Quick Money entre bloques; se corrige al entrar el bloque real.
export const ESTIMATED_ROULETTE_DRAW_MS = 25_000

// Todavía no existe un video de sorteo de Quick Money -- placeholder local hasta que llegue el asset
// real (decisión confirmada: mock + placeholder por ahora).
export const QUICK_MONEY_PLACEHOLDER_VIDEO_URL = buildMediaUrl('roulette-video.mp4')

// Red de seguridad por si el video nunca dispara 'ended' (red rota, decode colgado).
export const QUICK_MONEY_VIDEO_MAX_MS = 90_000
