import { create } from 'zustand'
import type { RouletteResult } from '../types/result'

interface ResultsState {
  currentWinner: RouletteResult | null
  history: RouletteResult[]
  maxResults: number
  addResult: (result: RouletteResult) => void
  setMaxResults: (n: number) => void
  clearResults: () => void
}

export const useResultsStore = create<ResultsState>((set) => ({
  currentWinner: null,
  history: [],
  maxResults: 10,

  addResult: (result) =>
    set((state) => ({
      currentWinner: result,
      history: state.currentWinner
        ? [state.currentWinner, ...state.history].slice(0, state.maxResults)
        : state.history,
    })),

  setMaxResults: (n) => set({ maxResults: n }),

  clearResults: () => set({ currentWinner: null, history: [] }),
}))