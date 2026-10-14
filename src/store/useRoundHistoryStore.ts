import { create } from 'zustand'

// Puente entre el botón "VIEW FULL HISTORY" (Pixi, dentro de <Application>, ver GameList.tsx) y el
// pop-up del historial (DOM, fuera del canvas, ver RoundHistoryModal.tsx): Pixi no puede renderizar
// HTML, así que el botón solo cambia este flag y el pop-up lo lee.
interface RoundHistoryState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useRoundHistoryStore = create<RoundHistoryState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
