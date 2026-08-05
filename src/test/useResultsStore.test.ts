import { describe, expect, it, beforeEach } from 'vitest'
import { useResultsStore } from '../store/useResultsStore'
import type { RouletteResult } from '../types/result'

function makeResult(overrides: Partial<Omit<RouletteResult, 'timeColor'>> = {}): Omit<RouletteResult, 'timeColor'> {
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
    useResultsStore.setState({ lastTimeColor: null })
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
    expect(state.currentWinner).toEqual(expect.objectContaining(first))
    expect(state.history).toEqual([])
  })

  it('pushes the previous current winner to the front of history when a new one arrives', () => {
    const first = makeResult({ drawNumber: '00001' })
    const second = makeResult({ drawNumber: '00002' })

    useResultsStore.getState().addResult(first)
    const firstWinner = useResultsStore.getState().currentWinner
    useResultsStore.getState().addResult(second)

    const state = useResultsStore.getState()
    expect(state.currentWinner).toEqual(expect.objectContaining(second))
    expect(state.history).toEqual([firstWinner])
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

  it('assigns a random valid timeColor to the first result', () => {
    useResultsStore.getState().addResult(makeResult())

    const { timeColor } = useResultsStore.getState().currentWinner!
    expect(['red', 'black']).toContain(timeColor)
  })

  it('alternates timeColor on every subsequent result', () => {
    useResultsStore.getState().addResult(makeResult({ drawNumber: '1' }))
    const firstColor = useResultsStore.getState().currentWinner!.timeColor

    useResultsStore.getState().addResult(makeResult({ drawNumber: '2' }))
    const secondColor = useResultsStore.getState().currentWinner!.timeColor

    useResultsStore.getState().addResult(makeResult({ drawNumber: '3' }))
    const thirdColor = useResultsStore.getState().currentWinner!.timeColor

    expect(secondColor).not.toBe(firstColor)
    expect(thirdColor).toBe(firstColor)
  })

  it('keeps alternating timeColor across a clearResults reset', () => {
    useResultsStore.getState().addResult(makeResult({ drawNumber: '1' }))
    const firstColor = useResultsStore.getState().currentWinner!.timeColor

    useResultsStore.getState().clearResults()
    useResultsStore.getState().addResult(makeResult({ drawNumber: '2' }))
    const secondColor = useResultsStore.getState().currentWinner!.timeColor

    expect(secondColor).not.toBe(firstColor)
  })
})
