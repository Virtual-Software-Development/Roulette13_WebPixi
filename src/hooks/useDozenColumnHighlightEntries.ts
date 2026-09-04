import { useEffect, useRef, useState } from 'react'
import { DIAMOND_INDICATOR_ENTER_DURATION_MS, DIAMOND_INDICATOR_LEAVE_DURATION_MS } from '../components/numberIndicators/diamondIndicatorTiming'
import type { DozenDiamondIndicatorEntry } from '../components/numberIndicators/DozenDiamondIndicatorLayer'
import type { ColumnDiamondIndicatorEntry } from '../components/numberIndicators/ColumnDiamondIndicatorLayer'
import { getPocketsForDozenGroup, getPocketsForColumnGroup } from '../utils/spinStatsHighlight'
import type { SpinStatsCategory } from './useSpinStatsCycle'
import type { DozenGroup, ColumnGroup } from '../types/numberIndicator'
import type { WheelType } from '../types/wheel'

// Mismo intervalo que CATEGORY_HIGHLIGHT_STAGGER_INTERVAL_MS en useCategoryHighlightEntries (fase
// 1) -- efecto acordeón, una casilla tras otra en vez de todas de golpe.
const STAGGER_INTERVAL_MS = 60

const DOZEN_GROUPS = new Set<string>(['firstDozen', 'secondDozen', 'thirdDozen'])
const COLUMN_GROUPS = new Set<string>(['firstColumn', 'secondColumn', 'thirdColumn'])

type DozenColumnTarget = { kind: 'dozen'; group: DozenGroup } | { kind: 'column'; group: ColumnGroup } | null

// Categorías que este hook sabe resaltar -- docena/columna (fase 2). Si la categoría activa es de
// fase 1 (red/black/even/odd/high/low), acá se trata como si no hubiera ninguna activa: fase 1
// resalta la rueda con NumberCellHighlightLayer (ver useCategoryHighlightEntries), no con los
// diamantes de docena/columna.
function toDozenColumnTarget(category: SpinStatsCategory | null): DozenColumnTarget {
  if (category && DOZEN_GROUPS.has(category)) return { kind: 'dozen', group: category as DozenGroup }
  if (category && COLUMN_GROUPS.has(category)) return { kind: 'column', group: category as ColumnGroup }
  return null
}

interface TrackedEntry {
  pocket: number
  group: DozenGroup | ColumnGroup
  phase: 'entering' | 'visible' | 'leaving'
  delayMs?: number
}

export interface DozenColumnHighlightEntries {
  dozenEntries: DozenDiamondIndicatorEntry[]
  columnEntries: ColumnDiamondIndicatorEntry[]
}

// Fase 2 de SpinStatsPanel (docenas/columnas): equivalente a useCategoryHighlightEntries (fase 1)
// pero puenteando entre DOS layers distintos (DozenDiamondIndicatorLayer/ColumnDiamondIndicator
// Layer) en vez de uno solo -- nunca hay más de un grupo activo (o en transición) a la vez, así
// que alcanza con UN estado interno (`entries` + `kind`, qué layer es dueño de esas entries en
// este instante) en vez de trackear ambos layers por separado.
//
// Mismo criterio ESTRICTO y secuencial que useCategoryHighlightEntries: el grupo saliente termina
// de irse del todo, en acordeón, ANTES de que el entrante empiece a aparecer -- nunca en paralelo,
// aunque el saliente sea de docenas y el entrante de columnas (o viceversa).
export function useDozenColumnHighlightEntries(categoryInput: SpinStatsCategory | null, wheelType: WheelType): DozenColumnHighlightEntries {
  const target = toDozenColumnTarget(categoryInput)
  const [kind, setKind] = useState<'dozen' | 'column' | null>(null)
  const [entries, setEntries] = useState<TrackedEntry[]>([])
  const stateRef = useRef({ kind, entries })
  stateRef.current = { kind, entries }
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    timeoutIdsRef.current.forEach(clearTimeout)
    timeoutIdsRef.current = []

    const startEntering = () => {
      const nextPockets = !target ? [] : target.kind === 'dozen' ? getPocketsForDozenGroup(target.group, wheelType) : getPocketsForColumnGroup(target.group, wheelType)

      setKind(target?.kind ?? null)

      const entering: TrackedEntry[] = target
        ? nextPockets.map((pocket, index) => ({
            pocket,
            group: target.group,
            phase: 'entering',
            delayMs: index * STAGGER_INTERVAL_MS,
          }))
        : []

      setEntries(entering)

      if (entering.length > 0) {
        const lastEnterDelayMs = (entering.length - 1) * STAGGER_INTERVAL_MS
        const enterTimeoutId = setTimeout(() => {
          setEntries((prev) => prev.map((entry) => ({ ...entry, phase: 'visible' })))
        }, lastEnterDelayMs + DIAMOND_INDICATOR_ENTER_DURATION_MS)
        timeoutIdsRef.current.push(enterTimeoutId)
      }
    }

    const previous = stateRef.current.entries

    if (previous.length === 0) {
      startEntering()
      return
    }

    const leaving: TrackedEntry[] = previous.map((entry, index) => ({
      ...entry,
      phase: 'leaving',
      delayMs: index * STAGGER_INTERVAL_MS,
    }))

    setEntries(leaving)

    const lastLeaveDelayMs = (leaving.length - 1) * STAGGER_INTERVAL_MS
    const leaveTimeoutId = setTimeout(startEntering, lastLeaveDelayMs + DIAMOND_INDICATOR_LEAVE_DURATION_MS)
    timeoutIdsRef.current.push(leaveTimeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- target es un objeto nuevo cada
    // render; kind+group (primitivos) alcanzan para saber si cambió de verdad.
  }, [target?.kind, target?.group, wheelType])

  return {
    dozenEntries: kind === 'dozen' ? (entries as DozenDiamondIndicatorEntry[]) : [],
    columnEntries: kind === 'column' ? (entries as ColumnDiamondIndicatorEntry[]) : [],
  }
}
