import { create } from 'zustand'
import type { RouletteResult, TimeColor } from '../types/result'
import { getOppositeTimeColor, pickRandomTimeColor } from '../utils/gradients'

interface ResultsState {
  currentWinner: RouletteResult | null
  history: RouletteResult[]
  maxResults: number
  lastTimeColor: TimeColor | null
  // Números crudos de /api/results (hasta ~100), sin pasar por RouletteResult/timeColor --
  // pensado para cálculos de frecuencia (hot/cold, ver DEMO_NUMBERS_BY_TYPE en
  // LobbyBackgroundLayer.tsx), no para la lista visible de GameList (esa sigue viniendo de
  // `history`, acotada a maxResults por el propio /gameInfo). Observado en la práctica: el rango
  // real es 0-37 (confirmado con varias llamadas), no 0-36 -- probablemente 37 representa '00' en
  // vez del string usado en WheelPocket acá (ver types/wheel.ts). Quien consuma este array para
  // mapear a casillas reales va a necesitar traducir 37 -> '00' explícitamente.
  rawResults: number[]
  addResult: (result: Omit<RouletteResult, 'timeColor'>) => void
  hydrateHistory: (results: Omit<RouletteResult, 'timeColor'>[]) => void
  setMaxResults: (n: number) => void
  setRawResults: (results: number[]) => void
  clearResults: () => void
}

export const useResultsStore = create<ResultsState>((set) => ({
  currentWinner: null,
  history: [],
  maxResults: 10,
  lastTimeColor: null,
  rawResults: [],

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

  setRawResults: (results) => set({ rawResults: results }),

  // lastTimeColor no se resetea: la alternancia debe seguir su curso aunque se limpien los resultados.
  clearResults: () => set({ currentWinner: null, history: [] }),
}))