import { describe, expect, it } from 'vitest'
import { useGameConfigStore } from '../store/useGameConfigStore'

describe('useGameConfigStore', () => {
  it('starts with no hardcoded game data', () => {
    const state = useGameConfigStore.getState()
    expect(state.gameName).toBe('')
    expect(state.logoUrl).toBe('')
    expect(state.backgroundUrl).toBe('')
  })

  it('merges partial updates without touching other fields', () => {
    useGameConfigStore.getState().setGameConfig({ gameName: 'Roulette Express' })

    const state = useGameConfigStore.getState()
    expect(state.gameName).toBe('Roulette Express')
  })
})
