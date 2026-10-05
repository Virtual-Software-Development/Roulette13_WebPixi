import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useNextDrawSync } from '../hooks/useNextDrawSync'
import { useGameConfigStore } from '../store/useGameConfigStore'

function gameInfo(drawNo: string, startTime: string) {
  return { ok: true, json: async () => ({ roundInterval: 300, nextDraw: { drawNo, startTime } }) } as Response
}

describe('useNextDrawSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-02T15:04:00'))
    useGameConfigStore.setState({ drawNumber: '', nextDrawStartTime: '', roundIntervalMs: 0 })
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('loads the next round and follows the backend to the following one after the draw', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(gameInfo('0106', '2026-10-02T15:05:00'))
      // Right after the draw the backend hasn't scheduled the next round yet...
      .mockResolvedValueOnce(gameInfo('0106', '2026-10-02T15:05:00'))
      // ...until it settles the current one.
      .mockResolvedValueOnce(gameInfo('0107', '2026-10-02T15:10:00'))

    renderHook(() => useNextDrawSync())
    await act(async () => {})
    expect(useGameConfigStore.getState()).toMatchObject({ drawNumber: '0106', nextDrawStartTime: '2026-10-02T15:05:00', roundIntervalMs: 300_000 })

    // Safety refresh caps the wait at 30s; skip ahead to just after the draw.
    await act(async () => {
      vi.setSystemTime(new Date('2026-10-02T15:05:01'))
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(useGameConfigStore.getState().drawNumber).toBe('0106')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })
    expect(useGameConfigStore.getState()).toMatchObject({ drawNumber: '0107', nextDrawStartTime: '2026-10-02T15:10:00' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('retries when /gameInfo fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('backend down'))
      .mockResolvedValueOnce(gameInfo('0106', '2026-10-02T15:05:00'))

    renderHook(() => useNextDrawSync())
    await act(async () => {})
    expect(useGameConfigStore.getState().drawNumber).toBe('')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })
    expect(useGameConfigStore.getState().drawNumber).toBe('0106')
  })

  it('stops syncing on unmount', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(gameInfo('0106', '2026-10-02T15:05:00'))
    const { unmount } = renderHook(() => useNextDrawSync())
    await act(async () => {})
    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
