import { create } from 'zustand'

export interface PendingDrawResult {
  drawNo: string
  result: number
  video: number
}

interface DrawCycleState {
  pendingResult: PendingDrawResult | null
  setPendingResult: (result: PendingDrawResult | null) => void
}

export const useDrawCycleStore = create<DrawCycleState>((set) => ({
  pendingResult: null,
  setPendingResult: (pendingResult) => set({ pendingResult }),
}))
