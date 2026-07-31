import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useClock } from '../hooks/useClock'

describe('useClock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T11:45:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('updates the time every second', () => {
    const { result } = renderHook(() => useClock())
    const initialTime = result.current.time

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.time).not.toBe(initialTime)
  })

  it('clears the interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
    const { unmount } = renderHook(() => useClock())

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})
