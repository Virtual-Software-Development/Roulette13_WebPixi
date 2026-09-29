import { afterEach, describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { RecentResultsStrip } from '../components/rouletteBetting/RecentResultsStrip'
import { useResultsStore } from '../store/useResultsStore'
import type { RouletteResult } from '../types/result'

function makeResult(i: number): RouletteResult {
  return { id: `r${i}`, timestamp: i, drawNumber: String(i), winningNumber: i % 37, timeColor: 'red' }
}

describe('RecentResultsStrip', () => {
  afterEach(() => useResultsStore.setState({ currentWinner: null, history: [] }))

  it('shows at most 13 results, newest (currentWinner) first', () => {
    useResultsStore.setState({
      currentWinner: makeResult(0),
      history: Array.from({ length: 20 }, (_, i) => makeResult(i + 1)),
    })
    const { container } = render(<RecentResultsStrip />)
    const pills = container.querySelectorAll('.recent-results-strip-row .recent-results-strip-pill')
    expect(pills).toHaveLength(13)
    expect(pills[0].textContent).toBe('0')
  })

  it('shows every result when there are fewer than 13', () => {
    useResultsStore.setState({ currentWinner: null, history: Array.from({ length: 5 }, (_, i) => makeResult(i + 1)) })
    const { container } = render(<RecentResultsStrip />)
    expect(container.querySelectorAll('.recent-results-strip-pill')).toHaveLength(5)
  })
})
