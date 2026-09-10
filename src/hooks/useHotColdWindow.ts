import { useEffect, useMemo, useState } from 'react'
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
export const VISIBLE_MIN_REMAINING_SECONDS = 70 // 1:20

// Cuánto esperar, después de que vuelve a aparecer la info del lobby (Header/Footer/
// SharedLayout, ver useDrawCycleStore.lobbyInfoVisible), antes de mostrar este panel -- para que
// no se sientan pisados/simultáneos.
const SHOW_DELAY_AFTER_LOBBY_INFO_MS = 5000

export interface HotColdWindow extends HotColdNumbers {
  shouldShow: boolean
}

// Fuente única de verdad para "qué números son hot/cold" y "cuándo se muestran" -- consumida
// tanto por NumberPanelHotCold (Pixi, arriba-izquierda) como por HotColdNumberChipLayer (fichas
// SVG ancladas a la rueda) para que ambos queden sincronizados: mismos números, mismo tiempo en
// pantalla.
export function useHotColdWindow(): HotColdWindow {
  const rawResults = useResultsStore((state) => state.rawResults)
  // A diferencia de `active` (que ya pasa a false apenas termina el hold, antes de que la rueda
  // termine de bajar de vuelta y de que el panel Winner se escale a 0), esto sigue en false hasta
  // que la info del lobby ya volvió a aparecer -- ver useDrawCycleStore.
  const lobbyInfoVisible = useDrawCycleStore((state) => state.lobbyInfoVisible)
  const nextDrawStartTime = useGameConfigStore((state) => state.nextDrawStartTime)
  const { remainingSeconds } = useCountdown(nextDrawStartTime)

  // Un solo setTimeout por ronda (no un polling continuo) -- se rearma cada vez que
  // lobbyInfoVisible vuelve a false al arrancar la siguiente ronda.
  const [delayElapsed, setDelayElapsed] = useState(false)
  useEffect(() => {
    if (!lobbyInfoVisible) {
      setDelayElapsed(false)
      return
    }
    const timer = setTimeout(() => setDelayElapsed(true), SHOW_DELAY_AFTER_LOBBY_INFO_MS)
    return () => clearTimeout(timer)
  }, [lobbyInfoVisible])

  const shouldShow = lobbyInfoVisible && delayElapsed && remainingSeconds > VISIBLE_MIN_REMAINING_SECONDS
  const { hot, cold, hotEntries, coldEntries, totalSpins } = useMemo(
    () => computeHotColdNumbers(rawResults, HOT_COLD_ENTRY_LIMIT),
    [rawResults],
  )

  return { shouldShow, hot, cold, hotEntries, coldEntries, totalSpins }
}
