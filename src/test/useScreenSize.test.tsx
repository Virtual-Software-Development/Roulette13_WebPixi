import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useScreenSize } from '../hooks/useScreenSize'

const fakeApp = { screen: { width: 1024, height: 768 } }

vi.mock('@pixi/react', () => ({
  useApplication: () => ({ app: fakeApp, isInitialised: true, isInitialising: false }),
}))

describe('useScreenSize', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fakeApp.screen = { width: 1024, height: 768 }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with the current app screen size', () => {
    const { result } = renderHook(() => useScreenSize())

    expect(result.current).toEqual({ width: 1024, height: 768 })
  })

  it('updates after the window is resized', () => {
    const { result } = renderHook(() => useScreenSize())

    fakeApp.screen = { width: 800, height: 600 }

    act(() => {
      window.dispatchEvent(new Event('resize'))
      vi.runAllTimers()
    })

    expect(result.current).toEqual({ width: 800, height: 600 })
  })
})
