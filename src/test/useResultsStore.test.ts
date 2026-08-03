import { describe, expect, it, beforeEach } from 'vitest'
import { useResultsStore } from '../store/useResultsStore'
import type { RouletteResult } from '../types/result'

function makeResult(overrides: Partial<RouletteResult> = {}): RouletteResult {
  return {
    id: crypto.randomUUID(),
    time: '11:45 AM',
    drawNumber: '00001',
    winningNumber: 8,
    ...overrides,
  }
}

describe('useResultsStore', () => {
  beforeEach(() => {
    useResultsStore.getState().clearResults()
    useResultsStore.getState().setMaxResults(10)
  })

  it('starts with no current winner and no history', () => {
    const state = useResultsStore.getState()
    expect(state.currentWinner).toBeNull()
    expect(state.history).toEqual([])
  })

  it('the first result becomes the current winner without touching history', () => {
    const first = makeResult({ drawNumber: '00001' })

    useResultsStore.getState().addResult(first)

    const state = useResultsStore.getState()
    expect(state.currentWinner).toEqual(first)
    expect(state.history).toEqual([])
  })

  it('pushes the previous current winner to the front of history when a new one arrives', () => {
    const first = makeResult({ drawNumber: '00001' })
    const second = makeResult({ drawNumber: '00002' })

    useResultsStore.getState().addResult(first)
    useResultsStore.getState().addResult(second)

    const state = useResultsStore.getState()
    expect(state.currentWinner).toEqual(second)
    expect(state.history).toEqual([first])
  })

  it('drops the oldest history entry once maxResults is exceeded', () => {
    useResultsStore.getState().setMaxResults(2)

    for (let i = 1; i <= 4; i++) {
      useResultsStore.getState().addResult(makeResult({ drawNumber: String(i) }))
    }

    const state = useResultsStore.getState()
    expect(state.currentWinner?.drawNumber).toBe('4')
    expect(state.history.map((r) => r.drawNumber)).toEqual(['3', '2'])
  })

  it('setMaxResults changes the limit used by future addResult calls', () => {
    useResultsStore.getState().setMaxResults(1)
    useResultsStore.getState().addResult(makeResult({ drawNumber: '00001' }))
    useResultsStore.getState().addResult(makeResult({ drawNumber: '00002' }))
    useResultsStore.getState().addResult(makeResult({ drawNumber: '00003' }))

    const state = useResultsStore.getState()
    expect(state.currentWinner?.drawNumber).toBe('00003')
    expect(state.history.map((r) => r.drawNumber)).toEqual(['00002'])
  })
})
