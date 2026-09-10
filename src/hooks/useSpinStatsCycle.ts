import { useMemo } from 'react'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { ensureClockTicking, useClockStore } from '../store/useClockStore'
import { parseApiDateTime } from '../utils/time'
import { VISIBLE_MIN_REMAINING_SECONDS } from './useHotColdWindow'
import type { DozenGroup, ColumnGroup } from '../types/numberIndicator'

// Cuánto esperar (en segundos reales) después de que Hot/Cold se oculta antes de mostrar este
// panel -- para que no se sientan pisados/simultáneos. Como Hot/Cold se oculta apenas
// remainingSeconds cae a VISIBLE_MIN_REMAINING_SECONDS o menos, "0.5s después" en tiempo real
// equivale a 0.5s MENOS de remaining. Pedido explícito: 0.5s exactos, no los ~2s de antes -- por
// eso acá abajo NO se reusa useCountdown().remainingSeconds (redondeado a entero, ver su
// comentario) sino que se recalcula el remaining en segundos con decimales directo desde
// useClockStore, con la misma precisión (~200ms) que el resto del reloj compartido.
const SHOW_DELAY_AFTER_HOT_COLD_SECONDS = 0.25
const VISIBLE_MAX_REMAINING_SECONDS = VISIBLE_MIN_REMAINING_SECONDS - SHOW_DELAY_AFTER_HOT_COLD_SECONDS
// Se oculta cuando faltan estos segundos o menos para el próximo sorteo -- deja aire antes de que
// arranque el video del sorteo.
const HIDE_AT_REMAINING_SECONDS = 5

// Timeline del ciclo, en segundos desde que el panel queda visible (no desde que carga la página
// -- ver comentario de `elapsed` más abajo, así si se entra a mitad de ronda el ciclo arranca ya
// en la fase que corresponda, no siempre desde cero).
const INITIAL_OFF_SECONDS = 3 // le da tiempo al panel a terminar de bajar antes de encender algo
const SUB_PHASE_DURATION_SECONDS = 6 // cuánto dura cada categoría activa (red/black/.../dozen/column)
// Cuánto tarda cada mitad (ocultar / revelar) de la transición entre fase 1 y fase 2 -- mismo
// orden de magnitud que TRANSITION_DURATION_MS (paneles), 0.55s.
const TRANSITION_SECONDS = 0.55

const PHASE1_SLOT_NAMES = ['red', 'black', 'evenOdd', 'highLow'] as const
const PHASE2_SLOT_NAMES = ['dozen', 'column'] as const
const PHASE1_DURATION_SECONDS = PHASE1_SLOT_NAMES.length * SUB_PHASE_DURATION_SECONDS // 24
const PHASE2_DURATION_SECONDS = PHASE2_SLOT_NAMES.length * SUB_PHASE_DURATION_SECONDS // 12

// Límites del ciclo completo (fase 1 -> mask -> fase 2 -> mask -> vuelve a fase 1), en segundos
// desde el arranque del ciclo (t=0). Ver useCategoryHighlightEntries/useDozenColumnHighlightEntries
// para el lado "qué se resalta en la rueda" de cada tramo.
const HIDE_PHASE1_START = PHASE1_DURATION_SECONDS // 24 -- termina highLow, empieza a ocultarse fase 1
const HIDE_PHASE1_END = HIDE_PHASE1_START + TRANSITION_SECONDS // 24.55
const REVEAL_PHASE2_END = HIDE_PHASE1_END + TRANSITION_SECONDS // 25.1 -- fase 2 ya visible del todo
const PHASE2_START = REVEAL_PHASE2_END
const PHASE2_END = PHASE2_START + PHASE2_DURATION_SECONDS // 37.1 -- termina column
const HIDE_PHASE2_END = PHASE2_END + TRANSITION_SECONDS // 37.65
const REVEAL_PHASE1_END = HIDE_PHASE2_END + TRANSITION_SECONDS // 38.2 -- fase 1 ya visible de nuevo
const CYCLE_DURATION_SECONDS = REVEAL_PHASE1_END

export type SpinStatsCategory = 'red' | 'black' | 'even' | 'odd' | 'high' | 'low' | DozenGroup | ColumnGroup
// Categorías de la fase 1 (donas color/even-odd/high-low) -- las únicas que resalta
// useCategoryHighlightEntries sobre NumberCellHighlightLayer. Se deriva con Exclude en vez de
// listarse aparte para que quede imposible que las dos definiciones se desincronicen.
export type Phase1Category = Exclude<SpinStatsCategory, DozenGroup | ColumnGroup>

export type SpinStatsDonutSet = 'phase1' | 'phase2'

export interface SpinStatsCycle {
  shouldShow: boolean
  // Categoría resaltada en este instante -- null durante los primeros INITIAL_OFF_SECONDS de cada
  // ronda, durante las transiciones de máscara entre fase 1 y fase 2, y mientras el panel no debe
  // mostrarse.
  activeCategory: SpinStatsCategory | null
  // Qué conjunto de donas corresponde tener montado -- 'phase1' (color/even-odd/high-low) o
  // 'phase2' (docenas/columnas). Un cambio de valor acá es la SEÑAL de que hay que animar la
  // transición -- no expone un progreso 0..1 propio: remainingSeconds (y por lo tanto todo lo que
  // sale de este hook) solo cambia una vez por segundo real, insuficiente para animar algo de
  // ~1s de duración sin que se vea a los saltos. SpinStatsPanel anima la transición en sí con su
  // propio useAnimatedProgress (un tick real de Pixi por frame), disparado por el CAMBIO de este
  // valor, no por su valor crudo.
  donutSet: SpinStatsDonutSet
}

// Hash determinístico simple (no cripto) -- mismo seed siempre da el mismo resultado, así el
// sorteo aleatorio entre las opciones (even/odd, high/low, qué docena, qué columna) de un ciclo
// puntual da lo mismo antes y después de recargar la página a mitad de ronda, en vez de "saltar"
// a otra elección.
function seededPick<T extends readonly unknown[]>(seed: string, options: T): T[number] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return options[Math.abs(hash) % options.length]
}

// Fuente única de verdad para "cuándo se muestra SpinStatsPanel", "qué categoría está resaltada
// en este instante" y "qué set de donas (fase 1 o fase 2) toca mostrar" -- consumida por
// SpinStatsPanel (donas), useCategoryHighlightEntries
// (NumberCellHighlightLayer, fase 1) y useDozenColumnHighlightEntries (Dozen/ColumnDiamond
// IndicatorLayer, fase 2). Todo se deriva de remainingSeconds (countdown real) en vez de un timer
// local, para que cargar la página a mitad de una animación la retome en la fase correcta en vez
// de reiniciar desde cero.
export function useSpinStatsCycle(): SpinStatsCycle {
  const active = useDrawCycleStore((state) => state.active)
  const nextDrawStartTime = useGameConfigStore((state) => state.nextDrawStartTime)
  ensureClockTicking()
  // Segundos reales CON decimales (a diferencia de useCountdown.remainingSeconds, que redondea
  // hacia arriba al entero más próximo para el texto MM:SS) -- ver SHOW_DELAY_AFTER_HOT_COLD_SECONDS.
  const remainingSeconds = useClockStore((state) => {
    if (!nextDrawStartTime) return 0
    return Math.max(0, parseApiDateTime(nextDrawStartTime).getTime() - state.now) / 1000
  })

  const shouldShow = !active && remainingSeconds <= VISIBLE_MAX_REMAINING_SECONDS && remainingSeconds > HIDE_AT_REMAINING_SECONDS

  return useMemo<SpinStatsCycle>(() => {
    if (!shouldShow) {
      return { shouldShow: false, activeCategory: null, donutSet: 'phase1' }
    }

    const elapsed = VISIBLE_MAX_REMAINING_SECONDS - remainingSeconds
    if (elapsed < INITIAL_OFF_SECONDS) {
      return { shouldShow: true, activeCategory: null, donutSet: 'phase1' }
    }

    const cyclePosition = elapsed - INITIAL_OFF_SECONDS
    const cycleIndex = Math.floor(cyclePosition / CYCLE_DURATION_SECONDS)
    const t = cyclePosition % CYCLE_DURATION_SECONDS

    let donutSet: SpinStatsDonutSet
    let activeSlot: (typeof PHASE1_SLOT_NAMES)[number] | (typeof PHASE2_SLOT_NAMES)[number] | null = null

    if (t < PHASE1_DURATION_SECONDS) {
      donutSet = 'phase1'
      activeSlot = PHASE1_SLOT_NAMES[Math.floor(t / SUB_PHASE_DURATION_SECONDS)]
    } else if (t < HIDE_PHASE1_END) {
      donutSet = 'phase1'
    } else if (t < REVEAL_PHASE2_END) {
      donutSet = 'phase2'
    } else if (t < PHASE2_END) {
      donutSet = 'phase2'
      activeSlot = PHASE2_SLOT_NAMES[Math.floor((t - PHASE2_START) / SUB_PHASE_DURATION_SECONDS)]
    } else if (t < HIDE_PHASE2_END) {
      donutSet = 'phase2'
    } else {
      donutSet = 'phase1'
    }

    let activeCategory: SpinStatsCategory | null = null
    if (activeSlot === 'red' || activeSlot === 'black') {
      activeCategory = activeSlot
    } else if (activeSlot === 'evenOdd') {
      activeCategory = seededPick(`${nextDrawStartTime}:evenOdd:${cycleIndex}`, ['even', 'odd'] as const)
    } else if (activeSlot === 'highLow') {
      activeCategory = seededPick(`${nextDrawStartTime}:highLow:${cycleIndex}`, ['high', 'low'] as const)
    } else if (activeSlot === 'dozen') {
      activeCategory = seededPick(`${nextDrawStartTime}:dozen:${cycleIndex}`, ['firstDozen', 'secondDozen', 'thirdDozen'] as const)
    } else if (activeSlot === 'column') {
      activeCategory = seededPick(`${nextDrawStartTime}:column:${cycleIndex}`, ['firstColumn', 'secondColumn', 'thirdColumn'] as const)
    }

    return { shouldShow: true, activeCategory, donutSet }
  }, [shouldShow, remainingSeconds, nextDrawStartTime])
}
