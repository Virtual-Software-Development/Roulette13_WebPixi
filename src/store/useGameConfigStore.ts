import { create } from 'zustand'

export interface GameConfig {
  gameName: string
  logoUrl: string
  backgroundUrl: string
  videoUrl: string
  drawNumber: string
  nextDrawStartTime: string
  // Cierre de apuestas del próximo sorteo (/gameInfo nextDraw.betsCloseTime) -- '' si el backend no
  // lo manda; ver useBettingRoundPhase.
  betsCloseTime: string
  // Duración de un round de Roulette (/gameInfo roundInterval, en ms) -- 0 hasta el primer /gameInfo.
  roundIntervalMs: number
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
  betsCloseTime: '',
  roundIntervalMs: 0,
  showLogo: true,
  balance: 0,
  setGameConfig: (config) => set(config),
}))
