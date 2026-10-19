import { create } from 'zustand'

// Juego cuyo historial muestra el pop-up (selector del header de RoundHistoryModal).
export type RoundHistoryGame = 'roulette' | 'quickMoney'

// Puente entre el botón "VIEW FULL HISTORY" (DOM, fijo encima del lobby, ver ViewHistoryButton.tsx)
// y el pop-up del historial (RoundHistoryModal.tsx): el botón abre el pop-up con un juego y el
// selector del pop-up lo cambia.
interface RoundHistoryState {
  isOpen: boolean
  game: RoundHistoryGame
  open: (game?: RoundHistoryGame) => void
  close: () => void
  setGame: (game: RoundHistoryGame) => void
}

export const useRoundHistoryStore = create<RoundHistoryState>((set) => ({
  isOpen: false,
  game: 'roulette',
  open: (game) => set((state) => ({ isOpen: true, game: game ?? state.game })),
  close: () => set({ isOpen: false }),
  setGame: (game) => set({ game }),
}))
