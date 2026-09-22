import { create } from 'zustand'
import type { BetSlipEntry } from '../types/betSlip'
import type { BetZone } from '../utils/rouletteBetZones'
import { CHIP_DENOMINATIONS } from '../data/betChipMockData'

interface BetSlipState {
  entries: BetSlipEntry[]
  selectedChipValue: number
  addBet: (zone: BetZone) => void
  removeBet: (zoneId: string) => void
  clearAll: () => void
  setSelectedChipValue: (value: number) => void
}

// Bet slip de la ronda actual -- apuestas PENDIENTES aún no confirmadas (ni por Player ni por
// Cashier). Un solo entry por zoneId (ver buildZoneId en utils/rouletteBetZones.ts): clicks
// repetidos sobre la misma zona suman `stake` al entry existente en vez de crear filas duplicadas.
export const useBetSlipStore = create<BetSlipState>((set) => ({
  entries: [],
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

  setSelectedChipValue: (value) => set({ selectedChipValue: value }),
}))
