import { create } from 'zustand'
import type { BetSlipEntry } from '../types/betSlip'
import type { BetZone } from '../utils/rouletteBetZones'
import { CHIP_DENOMINATIONS } from '../data/betChipMockData'

interface BetSlipState {
  entries: BetSlipEntry[]
  // Última apuesta realizada (Place Bet / Issue Ticket), para Rebet. Solo en memoria.
  lastPlaced: BetSlipEntry[]
  // Apuestas ya realizadas en la ronda `placedRound` (drawNumber), todos los tickets sumados por
  // zona. Siguen a la vista hasta que cambia la ronda -- también con la conexión caída, cuando el
  // resto de la pantalla ya no es confiable (ver SelectedBetsList). Solo en memoria.
  placed: BetSlipEntry[]
  placedRound: string | null
  selectedChipValue: number
  addBet: (zone: BetZone) => void
  removeBet: (zoneId: string) => void
  clearAll: () => void
  // La apuesta del slip quedó realizada en la ronda `round`: se guarda como la última, se suma a las
  // realizadas de esa ronda y se vacía el slip.
  markPlaced: (round: string) => void
  // Vuelve a cargar en el slip la última apuesta realizada (reemplaza lo que haya).
  rebet: () => void
  // Duplica el monto de cada apuesta del slip.
  doubleAll: () => void
  setSelectedChipValue: (value: number) => void
}

function mergeByZone(placed: BetSlipEntry[], added: BetSlipEntry[]): BetSlipEntry[] {
  const merged = placed.map((entry) => ({ ...entry }))
  for (const entry of added) {
    const existing = merged.find((other) => other.zoneId === entry.zoneId)
    if (existing) existing.stake += entry.stake
    else merged.push({ ...entry })
  }
  return merged
}

// Bet slip de la ronda actual -- apuestas PENDIENTES aún no confirmadas (ni por Player ni por
// Cashier). Un solo entry por zoneId (ver buildZoneId en utils/rouletteBetZones.ts): clicks
// repetidos sobre la misma zona suman `stake` al entry existente en vez de crear filas duplicadas.
export const useBetSlipStore = create<BetSlipState>((set) => ({
  entries: [],
  lastPlaced: [],
  placed: [],
  placedRound: null,
  selectedChipValue: CHIP_DENOMINATIONS[0],

  addBet: (zone) =>
    set((state) => {
      const existing = state.entries.find((entry) => entry.zoneId === zone.id)
      if (existing) {
        return {
          entries: state.entries.map((entry) =>
            entry.zoneId === zone.id ? { ...entry, stake: entry.stake + state.selectedChipValue } : entry,
          ),
        }
      }
      const newEntry: BetSlipEntry = {
        zoneId: zone.id,
        betType: zone.betType,
        selection: zone.selection,
        stake: state.selectedChipValue,
      }
      return { entries: [...state.entries, newEntry] }
    }),

  removeBet: (zoneId) => set((state) => ({ entries: state.entries.filter((entry) => entry.zoneId !== zoneId) })),

  clearAll: () => set({ entries: [] }),

  markPlaced: (round) =>
    set((state) => ({
      lastPlaced: state.entries,
      entries: [],
      placed: mergeByZone(state.placedRound === round ? state.placed : [], state.entries),
      placedRound: round,
    })),

  rebet: () => set((state) => ({ entries: state.lastPlaced.map((entry) => ({ ...entry })) })),

  doubleAll: () => set((state) => ({ entries: state.entries.map((entry) => ({ ...entry, stake: entry.stake * 2 })) })),

  setSelectedChipValue: (value) => set({ selectedChipValue: value }),
}))
