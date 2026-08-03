import { create } from 'zustand'

export interface GameConfig {
  gameName: string
  logoUrl: string
  backgroundUrl: string
  videoUrl: string
  showTitle: boolean
  showDateTime: boolean
  drawImageUrl: string
  drawNumber: string
  nextDrawTime: string
  showDrawInfo: boolean
  showLogo: boolean
}

interface GameConfigStore extends GameConfig {
  setGameConfig: (config: Partial<GameConfig>) => void
}

export const useGameConfigStore = create<GameConfigStore>((set) => ({
  gameName: '',
  logoUrl: '',
  backgroundUrl: '',
  videoUrl: '',
  showTitle: true,
  showDateTime: true,
  drawImageUrl: '',
  drawNumber:'',
  nextDrawTime:'',
  showDrawInfo: true,
  showLogo: true,
  setGameConfig: (config) => set(config),
}))
