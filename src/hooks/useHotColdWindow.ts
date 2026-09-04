import { useMemo } from 'react'
import { useResultsStore } from '../store/useResultsStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useCountdown } from './useCountdown'
import { computeHotColdNumbers, type HotColdNumbers } from '../utils/hotColdNumbers'

// Cantidad de números hot/cold calculados -- fuente única para NumberPanelHotCold (filas del
// panel) y HotColdNumberChipLayer (fichas sobre la rueda), así ambos muestran siempre el mismo
// conjunto de números.
export const HOT_COLD_ENTRY_LIMIT = 5

// El panel/fichas de hot-cold solo se muestran al arranque de cada ronda, mientras todavía falta
// más de este umbral para el próximo sorteo (la ronda completa dura ~1:30, ver useCountdown) --
// ligado al countdown real en vez de un timer local para que, si se entra a mitad de una ronda ya
// avanzada, no aparezcan igual.
export const VISIBLE_MIN_REMAINING_SECONDS = 80 // 1:20

export interface HotColdWindow extends HotColdNumbers {
  shouldShow: boolean
}

// Fuente única de verdad para "qué números son hot/cold" y "cuándo se muestran" -- consumida
// tanto por NumberPanelHotCold (Pixi, arriba-izquierda) como por HotColdNumberChipLayer (fichas
// SVG ancladas a la rueda) para que ambos queden sincronizados: mismos números, mismo tiempo en
// pantalla.
export function useHotColdWindow(): HotColdWindow {
  const rawResults = useResultsStore((state) => state.rawResults)
  const active = useDrawCycleStore((state) => state.active)
  const nextDrawStartTime = useGameConfigStore((state) => state.nextDrawStartTime)
  const { remainingSeconds } = useCountdown(nextDrawStartTime)

  const shouldShow = !active && remainingSeconds > VISIBLE_MIN_REMAINING_SECONDS
  const { hot, cold } = useMemo(() => computeHotColdNumbers(rawResults, HOT_COLD_ENTRY_LIMIT), [rawResults])

  return { shouldShow, hot, cold }
}
