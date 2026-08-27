import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCountdown } from '../hooks/useCountdown'

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T11:45:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts down to the target time', () => {
    const { result } = renderHook(() => useCountdown('2026-07-30T11:45:30'))

    expect(result.current.remainingSeconds).toBe(30)
    expect(result.current.display).toBe('00:30')

    act(() => {
      vi.setSystemTime(new Date('2026-07-30T11:45:10'))
      vi.advanceTimersByTime(200)
    })

    expect(result.current.remainingSeconds).toBe(20)
    expect(result.current.display).toBe('00:20')
  })

  it('marks urgent when 10 seconds or fewer remain', () => {
    const { result } = renderHook(() => useCountdown('2026-07-30T11:45:08'))

    expect(result.current.urgent).toBe(true)
  })

  it('is not urgent with more than 10 seconds remaining', () => {
    const { result } = renderHook(() => useCountdown('2026-07-30T11:45:30'))

    expect(result.current.urgent).toBe(false)
  })

  it('clamps to zero once the target time has passed', () => {
    const { result } = renderHook(() => useCountdown('2026-07-30T11:44:00'))

    expect(result.current.remainingSeconds).toBe(0)
    expect(result.current.display).toBe('00:00')
    expect(result.current.urgent).toBe(true)
  })

  it('clears the interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
    const { unmount } = renderHook(() => useCountdown('2026-07-30T11:45:30'))

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})
