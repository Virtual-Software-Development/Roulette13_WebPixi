import { beforeEach, describe, expect, it } from 'vitest'
import { useBetSlipStore } from '../store/useBetSlipStore'
import { useQuickMoneyBetSlipStore } from '../store/useQuickMoneyBetSlipStore'
import type { BetSlipEntry } from '../types/betSlip'

const red: BetSlipEntry = { zoneId: 'red', betType: 'redBlack', selection: { type: 'redBlack', color: 'red' }, stake: 5 } as BetSlipEntry
const seven: BetSlipEntry = { zoneId: 'straight-7', betType: 'straightUp', selection: { type: 'straightUp', pockets: [7] }, stake: 1 } as BetSlipEntry

describe('roulette placed bets', () => {
  beforeEach(() => {
    useBetSlipStore.setState({ entries: [], lastPlaced: [], placed: [], placedRound: null })
  })

  it('keeps every ticket of the round, summed by zone, and empties the slip', () => {
    useBetSlipStore.setState({ entries: [red, seven] })
    useBetSlipStore.getState().markPlaced('120')
    useBetSlipStore.setState({ entries: [red] })
    useBetSlipStore.getState().markPlaced('120')

    const state = useBetSlipStore.getState()
    expect(state.entries).toEqual([])
    expect(state.lastPlaced).toEqual([red])
    expect(state.placedRound).toBe('120')
    expect(state.placed).toEqual([{ ...red, stake: 10 }, seven])
  })

  it('starts over on a new round', () => {
    useBetSlipStore.setState({ entries: [red] })
    useBetSlipStore.getState().markPlaced('120')
    useBetSlipStore.setState({ entries: [seven] })
    useBetSlipStore.getState().markPlaced('121')

    expect(useBetSlipStore.getState().placedRound).toBe('121')
    expect(useBetSlipStore.getState().placed).toEqual([seven])
  })

  it('never mutates the entries it was given', () => {
    useBetSlipStore.setState({ entries: [red] })
    useBetSlipStore.getState().markPlaced('120')
    useBetSlipStore.setState({ entries: [red] })
    useBetSlipStore.getState().markPlaced('120')
    expect(red.stake).toBe(5)
  })
})

describe('quick money placed bets', () => {
  beforeEach(() => {
    useQuickMoneyBetSlipStore.setState({ entries: [], placed: [], placedRound: null })
  })

  it('keeps the draw tickets summed by id until the draw changes', () => {
    const { addBet, markPlaced } = useQuickMoneyBetSlipStore.getState()
    addBet({ betType: 'straight', digits: [1, 2, 3] }, 2)
    markPlaced('0042')
    addBet({ betType: 'straight', digits: [1, 2, 3] }, 3)
    markPlaced('0042')

    let state = useQuickMoneyBetSlipStore.getState()
    expect(state.entries).toEqual([])
    expect(state.placed).toHaveLength(1)
    expect(state.placed[0].stake).toBe(5)

    addBet({ betType: 'straight', digits: [9, 9, 9] }, 1)
    markPlaced('0043')
    state = useQuickMoneyBetSlipStore.getState()
    expect(state.placedRound).toBe('0043')
    expect(state.placed.map((entry) => entry.selection.digits)).toEqual([[9, 9, 9]])
  })
})
