import { create } from 'zustand'

export interface GameConfig {
  gameName: string
  logoUrl: string
  backgroundUrl: string
}

interface GameConfigStore extends GameConfig {
  setGameConfig: (config: Partial<GameConfig>) => void
}

export const useGameConfigStore = create<GameConfigStore>((set) => ({
  gameName: '',
  logoUrl: '',
  backgroundUrl: '',
  setGameConfig: (config) => set(config),
}))
