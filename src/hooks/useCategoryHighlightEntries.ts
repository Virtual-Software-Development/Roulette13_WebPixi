import { useEffect, useRef, useState } from 'react'
import { NUMBER_CELL_HIGHLIGHT_ENTER_DURATION_MS, NUMBER_CELL_HIGHLIGHT_LEAVE_DURATION_MS } from '../components/numberIndicators/NumberCellHighlight'
import type { NumberCellHighlightEntry } from '../components/numberIndicators/NumberCellHighlightLayer'
import type { Phase1Category, SpinStatsCategory } from './useSpinStatsCycle'
import { getPocketsForCategory } from '../utils/spinStatsHighlight'
import { SPIN_STATS_CATEGORY_COLOR, numberToCssHex } from '../utils/spinStatsColors'
import type { WheelType } from '../types/wheel'

// Categorías que este hook sabe resaltar -- red/black/even/odd/high/low (fase 1). Si la categoría
// activa es de fase 2 (docena/columna), acá se trata como si no hubiera ninguna activa: fase 2
// resalta la rueda con Dozen/ColumnDiamondIndicatorLayer (ver useDozenColumnHighlightEntries), no
// con NumberCellHighlightLayer.
const PHASE1_CATEGORIES = new Set<string>(['red', 'black', 'even', 'odd', 'high', 'low'])
function toPhase1Category(category: SpinStatsCategory | null): Phase1Category | null {
  return category !== null && PHASE1_CATEGORIES.has(category) ? (category as Phase1Category) : null
}

// Cuánto tarda en arrancar cada casilla siguiente del mismo grupo (entrando o saliendo) -- efecto
// acordeón, una tras otra en vez de todas de golpe. getPocketsForCategory ya devuelve las casillas
// en el orden físico real de la rueda (ver getWheelOrder), así que el acordeón "recorre" la rueda
// en ese mismo orden. Bien más chico que NUMBER_CELL_HIGHLIGHT_STAGGER_INTERVAL_MS (el de
// useNumberCellHighlightCycle, pensado para grupos de 3-5 números) porque acá los grupos llegan a
// tener 18 -- con ese intervalo el recorrido completo tardaría más que la ventana de 6s que dura
// cada categoría activa (ver useSpinStatsCycle).
const CATEGORY_HIGHLIGHT_STAGGER_INTERVAL_MS = 60

// Convierte la categoría activa (ver useSpinStatsCycle) en las entries de NumberCellHighlightLayer,
// secuenciando la transición entre un grupo y el siguiente en dos pasos, nunca en paralelo:
// 1) el grupo actual (TODAS sus casillas, en acordeón -- ver CATEGORY_HIGHLIGHT_STAGGER_INTERVAL_MS)
//    juega su animación de salida.
// 2) recién cuando esa salida termina por completo (la última casilla del acordeón ya desmontada),
//    arranca la entrada del grupo siguiente, también en acordeón. Una casilla que pertenece a
//    ambos grupos (p.ej. un número rojo Y par, al pasar de "red" a "even") no queda "enganchada"
//    a mitad de camino -- primero se apaga del todo con el grupo viejo, después se prende de
//    nuevo con el color del grupo nuevo cuando le toca su turno en el acordeón de entrada.
export function useCategoryHighlightEntries(categoryInput: SpinStatsCategory | null, wheelType: WheelType): NumberCellHighlightEntry[] {
  const category = toPhase1Category(categoryInput)
  const [entries, setEntries] = useState<NumberCellHighlightEntry[]>([])
  const entriesRef = useRef(entries)
  entriesRef.current = entries
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    timeoutIdsRef.current.forEach(clearTimeout)
    timeoutIdsRef.current = []

    const startEntering = () => {
      const nextPockets = category ? getPocketsForCategory(category, wheelType) : []
      const nextColor = category ? numberToCssHex(SPIN_STATS_CATEGORY_COLOR[category]) : ''
      const entering: NumberCellHighlightEntry[] = nextPockets.map((pocket, index) => ({
        pocket,
        phase: 'entering',
        color: nextColor,
        delayMs: index * CATEGORY_HIGHLIGHT_STAGGER_INTERVAL_MS,
      }))

      setEntries(entering)

      if (entering.length > 0) {
        const lastEnterDelayMs = (entering.length - 1) * CATEGORY_HIGHLIGHT_STAGGER_INTERVAL_MS
        const enterTimeoutId = setTimeout(() => {
          setEntries((prev) => prev.map((entry) => ({ ...entry, phase: 'visible' })))
        }, lastEnterDelayMs + NUMBER_CELL_HIGHLIGHT_ENTER_DURATION_MS)
        timeoutIdsRef.current.push(enterTimeoutId)
      }
    }

    const previous = entriesRef.current

    if (previous.length === 0) {
      startEntering()
      return
    }

    const leaving: NumberCellHighlightEntry[] = previous.map((entry, index) => ({
      pocket: entry.pocket,
      phase: 'leaving',
      color: entry.color,
      delayMs: index * CATEGORY_HIGHLIGHT_STAGGER_INTERVAL_MS,
    }))

    setEntries(leaving)

    const lastLeaveDelayMs = (leaving.length - 1) * CATEGORY_HIGHLIGHT_STAGGER_INTERVAL_MS
    const leaveTimeoutId = setTimeout(startEntering, lastLeaveDelayMs + NUMBER_CELL_HIGHLIGHT_LEAVE_DURATION_MS)
    timeoutIdsRef.current.push(leaveTimeoutId)
  }, [category, wheelType])

  return entries
}
