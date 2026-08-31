import { useEffect, useState } from 'react'
import { getRouletteColor } from '../utils/rouletteColors'
import type { RouletteColor } from '../utils/rouletteColors'
import { NUMBER_CELL_HIGHLIGHT_ENTER_DURATION_MS, NUMBER_CELL_HIGHLIGHT_LEAVE_DURATION_MS } from '../components/numberIndicators/NumberCellHighlight'
import type { NumberCellHighlightEntry } from '../components/numberIndicators/NumberCellHighlightLayer'
import type { WheelPocket } from '../types/wheel'

// Cuánto tarda en arrancar cada número siguiente del mismo grupo -- menor que la duración de la
// animación de entrada/salida (ver NumberCellHighlight.tsx) para que el siguiente número empiece
// a aparecer un poco antes de que el anterior termine, en vez de esperar a que termine del todo.
const NUMBER_CELL_HIGHLIGHT_STAGGER_INTERVAL_MS = 650

// Cuánto tiempo queda un grupo completo visible antes de empezar a desactivarse.
const NUMBER_CELL_HIGHLIGHT_HOLD_DURATION_MS = 1800

// Orden fijo del ciclo -- se saltea cualquier color que no tenga números en la lista de entrada.
const CYCLE_COLOR_ORDER: RouletteColor[] = ['red', 'black', 'green']

type CyclePhase = 'entering' | 'visible' | 'leaving'

function groupByColor(numbers: WheelPocket[]): WheelPocket[][] {
  const byColor = new Map<RouletteColor, WheelPocket[]>()
  for (const pocket of numbers) {
    const color = getRouletteColor(pocket)
    const group = byColor.get(color)
    if (group) {
      group.push(pocket)
    } else {
      byColor.set(color, [pocket])
    }
  }

  return CYCLE_COLOR_ORDER.map((color) => byColor.get(color)).filter((group): group is WheelPocket[] => !!group && group.length > 0)
}

// Cicla automáticamente los números de `numbers` agrupados por su color real: activa un grupo
// completo (aparición escalonada, número por número), lo mantiene visible, lo desactiva (misma
// animación pero invertida, también escalonada) y pasa al siguiente grupo -- en bucle infinito.
// Devuelve la lista de entries lista para <NumberCellHighlightLayer entries={...} />.
export function useNumberCellHighlightCycle(numbers: WheelPocket[]): NumberCellHighlightEntry[] {
  const [groupIndex, setGroupIndex] = useState(0)
  const [cyclePhase, setCyclePhase] = useState<CyclePhase>('entering')

  const groups = groupByColor(numbers)
  const activeGroup = groups.length > 0 ? groups[groupIndex % groups.length] : []
  const lastDelayMs = (activeGroup.length - 1) * NUMBER_CELL_HIGHLIGHT_STAGGER_INTERVAL_MS

  useEffect(() => {
    if (groups.length === 0) return undefined

    if (cyclePhase === 'entering') {
      const timeoutId = setTimeout(() => setCyclePhase('visible'), lastDelayMs + NUMBER_CELL_HIGHLIGHT_ENTER_DURATION_MS)
      return () => clearTimeout(timeoutId)
    }

    if (cyclePhase === 'visible') {
      const timeoutId = setTimeout(() => setCyclePhase('leaving'), NUMBER_CELL_HIGHLIGHT_HOLD_DURATION_MS)
      return () => clearTimeout(timeoutId)
    }

    const timeoutId = setTimeout(() => {
      setGroupIndex((index) => (index + 1) % groups.length)
      setCyclePhase('entering')
    }, lastDelayMs + NUMBER_CELL_HIGHLIGHT_LEAVE_DURATION_MS)
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- groups/activeGroup son objetos
    // nuevos cada render; sus .length alcanzan para decidir cuándo reprogramar el timeout.
  }, [cyclePhase, groupIndex, groups.length, lastDelayMs])

  return activeGroup.map((pocket, index) => ({
    pocket,
    phase: cyclePhase,
    delayMs: index * NUMBER_CELL_HIGHLIGHT_STAGGER_INTERVAL_MS,
  }))
}
