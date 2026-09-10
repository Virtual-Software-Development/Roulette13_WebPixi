import { create } from 'zustand'

export interface GameConfig {
  gameName: string
  logoUrl: string
  backgroundUrl: string
  videoUrl: string
  drawNumber: string
  nextDrawStartTime: string
  showLogo: boolean
  balance: number
}

interface GameConfigStore extends GameConfig {
  setGameConfig: (config: Partial<GameConfig>) => void
}

export const useGameConfigStore = create<GameConfigStore>((set) => ({
  gameName: '',
  logoUrl: '',
  backgroundUrl: '',
  videoUrl: '',
  drawNumber:'',
  nextDrawStartTime:'',
  showLogo: true,
  balance: 0,
  setGameConfig: (config) => set(config),
}))
