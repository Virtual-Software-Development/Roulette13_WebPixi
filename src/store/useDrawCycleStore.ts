import { create } from 'zustand'

export interface PendingDrawResult {
  drawNo: string
  result: number
}

interface DrawCycleState {
  pendingResult: PendingDrawResult | null
  setPendingResult: (result: PendingDrawResult | null) => void
  // true mientras la secuencia de video está en curso (subiendo, reproduciendo,
  // congelado en el resultado, o bajando) — leído directamente por RouletteVideoSprite
  // y por los elementos de ResultsView que salen/vuelven de escena en simultáneo.
  active: boolean
  setActive: (active: boolean) => void
}

export const useDrawCycleStore = create<DrawCycleState>((set) => ({
  pendingResult: null,
  setPendingResult: (pendingResult) => set({ pendingResult }),
  active: false,
  setActive: (active) => set({ active }),
}))
