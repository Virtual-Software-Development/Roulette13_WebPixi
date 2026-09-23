import { create } from 'zustand'
import type { QuickMoneyBetSlipEntry } from '../types/quickMoneyBetSlip'
import type { QuickMoneyBetSelection } from '../types/quickMoneyBet'
import { buildQuickMoneyEntryId } from '../utils/quickMoneyBetLabel'

interface QuickMoneyBetSlipState {
  entries: QuickMoneyBetSlipEntry[]
  addBet: (selection: QuickMoneyBetSelection, stake: number) => void
  removeBet: (id: string) => void
  clearAll: () => void
}

// Bet slip de Quick Money -- mismo patrón que useBetSlipStore.ts (roulette), pero acá no hay
// "chip seleccionado": el monto lo arma BetAmountCard antes de tocar Add to Bet Slip, así que
// addBet recibe el stake explícito en vez de leerlo de un state compartido. Un solo entry por id
// (ver buildQuickMoneyEntryId): agregar la misma combinación juego+tipo+dígitos suma el monto en
// vez de duplicar fila.
export const useQuickMoneyBetSlipStore = create<QuickMoneyBetSlipState>((set) => ({
  entries: [],

  addBet: (selection, stake) =>
    set((state) => {
      const id = buildQuickMoneyEntryId(selection)
      const existing = state.entries.find((entry) => entry.id === id)
      if (existing) {
        return { entries: state.entries.map((entry) => (entry.id === id ? { ...entry, stake: entry.stake + stake } : entry)) }
      }
      const newEntry: QuickMoneyBetSlipEntry = { id, selection, stake }
      return { entries: [...state.entries, newEntry] }
    }),

  removeBet: (id) => set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) })),

  clearAll: () => set({ entries: [] }),
}))
