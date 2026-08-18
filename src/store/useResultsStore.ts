import { create } from 'zustand'
import type { RouletteResult, TimeColor } from '../types/result'
import { getOppositeTimeColor, pickRandomTimeColor } from '../utils/gradients'

interface ResultsState {
  currentWinner: RouletteResult | null
  history: RouletteResult[]
  maxResults: number
  lastTimeColor: TimeColor | null
  addResult: (result: Omit<RouletteResult, 'timeColor'>) => void
  hydrateHistory: (results: Omit<RouletteResult, 'timeColor'>[]) => void
  setMaxResults: (n: number) => void
  clearResults: () => void
}

export const useResultsStore = create<ResultsState>((set) => ({
  currentWinner: null,
  history: [],
  maxResults: 10,
  lastTimeColor: null,

  addResult: (result) =>
    set((state) => {
      const timeColor = state.lastTimeColor ? getOppositeTimeColor(state.lastTimeColor) : pickRandomTimeColor()

      return {
        currentWinner: { ...result, timeColor },
        lastTimeColor: timeColor,
        history: state.currentWinner
          ? [state.currentWinner, ...state.history].slice(0, state.maxResults)
          : state.history,
      }
    }),

  hydrateHistory: (results) =>
    set((state) => {
      if (results.length === 0) return { currentWinner: null, history: [] }

      let color = state.lastTimeColor ? getOppositeTimeColor(state.lastTimeColor) : pickRandomTimeColor()
      const withColors = results.map((r) => {
        const entry = { ...r, timeColor: color }
        color = getOppositeTimeColor(color)
        return entry
      })
      const [currentWinner, ...history] = withColors

      return { currentWinner, history, lastTimeColor: currentWinner.timeColor }
    }),

  setMaxResults: (n) => set({ maxResults: n }),

  // lastTimeColor no se resetea: la alternancia debe seguir su curso aunque se limpien los resultados.
  clearResults: () => set({ currentWinner: null, history: [] }),
}))