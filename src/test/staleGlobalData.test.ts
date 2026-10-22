import { beforeEach, describe, expect, it } from 'vitest'
import { startStaleGlobalDataWatch } from '../store/staleGlobalData'
import { useBetsSummaryStore } from '../store/useBetsSummaryStore'
import { useResultsStore } from '../store/useResultsStore'
import { useBackendStore } from '../store/useBackendStore'
import { useClockSyncStore } from '../store/useClockSyncStore'
import { useInternetStore } from '../store/useInternetStore'
import { useMqttStore } from '../store/useMqttStore'
import type { LiveTableBetsData } from '../types/liveTableBets'
import type { ResultStatsData } from '../types/resultStats'

const summary = {
  liveTableBetsData: { numbers: [] } as unknown as LiveTableBetsData,
  resultStatsData: {} as ResultStatsData,
}
const result = { id: '1', timestamp: 0, drawNumber: '0010', winningNumber: 7 }

describe('degraded mode: stale global data', () => {
  beforeEach(() => {
    useInternetStore.setState({ offline: false })
    useBackendStore.setState({ offline: false })
    useMqttStore.setState({ offline: false })
    useClockSyncStore.setState({ status: 'synced' })
    useBetsSummaryStore.setState({ stale: false })
    useResultsStore.setState({ stale: false, rawResultsStale: false })
    startStaleGlobalDataWatch()
  })

  it('marks totals and results stale when the connection is lost', () => {
    useBackendStore.setState({ offline: true })
    expect(useBetsSummaryStore.getState().stale).toBe(true)
    expect(useResultsStore.getState().stale).toBe(true)
    expect(useResultsStore.getState().rawResultsStale).toBe(true)
  })

  it('keeps them stale after reconnecting until fresh data arrives', () => {
    useMqttStore.setState({ offline: true })
    useMqttStore.setState({ offline: false })
    expect(useBetsSummaryStore.getState().stale).toBe(true)
    expect(useResultsStore.getState().stale).toBe(true)

    useBetsSummaryStore.getState().setBetsSummary(summary)
    expect(useBetsSummaryStore.getState().stale).toBe(false)

    // A single new result on top of a list with gaps is still a list with gaps.
    useResultsStore.getState().addResult(result)
    expect(useResultsStore.getState().stale).toBe(true)
    useResultsStore.getState().hydrateHistory([result])
    expect(useResultsStore.getState().stale).toBe(false)

    expect(useResultsStore.getState().rawResultsStale).toBe(true)
    useResultsStore.getState().setRawResults([7])
    expect(useResultsStore.getState().rawResultsStale).toBe(false)
  })

  it('does not mark anything for a clock problem alone', () => {
    useClockSyncStore.setState({ status: 'failed' })
    expect(useBetsSummaryStore.getState().stale).toBe(false)
    expect(useResultsStore.getState().stale).toBe(false)
  })
})
