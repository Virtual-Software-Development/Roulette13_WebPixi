import { create } from 'zustand'
import type { QuickMoneyBetSlipEntry } from '../types/quickMoneyBetSlip'
import type { QuickMoneyBetSelection } from '../types/quickMoneyBet'
import { buildQuickMoneyEntryId } from '../utils/quickMoneyBetLabel'

interface QuickMoneyBetSlipState {
  entries: QuickMoneyBetSlipEntry[]
  // Apuestas ya realizadas en el sorteo `placedRound` (drawNumber), sumadas por id -- mismo
  // criterio que useBetSlipStore.placed: siguen a la vista hasta que cambia el sorteo, también con
  // la conexión caída (ver QuickMoneyBetSlip). Solo en memoria.
  placed: QuickMoneyBetSlipEntry[]
  placedRound: string | null
  addBet: (selection: QuickMoneyBetSelection, stake: number) => void
  removeBet: (id: string) => void
  clearAll: () => void
  // El slip quedó realizado en el sorteo `round`: se suma a las realizadas y se vacía.
  markPlaced: (round: string) => void
}

function mergeById(placed: QuickMoneyBetSlipEntry[], added: QuickMoneyBetSlipEntry[]): QuickMoneyBetSlipEntry[] {
  const merged = placed.map((entry) => ({ ...entry }))
  for (const entry of added) {
    const existing = merged.find((other) => other.id === entry.id)
    if (existing) existing.stake += entry.stake
    else merged.push({ ...entry })
  }
  return merged
}

// Bet slip de Quick Money -- mismo patrón que useBetSlipStore.ts (roulette), pero acá no hay
// "chip seleccionado": el monto lo arma BetAmountCard antes de tocar Add to Bet Slip, así que
// addBet recibe el stake explícito en vez de leerlo de un state compartido. Un solo entry por id
// (ver buildQuickMoneyEntryId): agregar la misma combinación juego+tipo+dígitos suma el monto en
// vez de duplicar fila.
export const useQuickMoneyBetSlipStore = create<QuickMoneyBetSlipState>((set) => ({
  entries: [],
  placed: [],
  placedRound: null,

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

  markPlaced: (round) =>
    set((state) => ({
      entries: [],
      placed: mergeById(state.placedRound === round ? state.placed : [], state.entries),
      placedRound: round,
    })),
}))
