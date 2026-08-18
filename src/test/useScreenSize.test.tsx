import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useScreenSize } from '../hooks/useScreenSize'

function createFakeRenderer() {
  const listeners = new Set<() => void>()
  return {
    on: (_event: string, cb: () => void) => listeners.add(cb),
    off: (_event: string, cb: () => void) => listeners.delete(cb),
    emit: () => listeners.forEach((cb) => cb()),
  }
}

const fakeApp = { screen: { width: 1024, height: 768 }, renderer: createFakeRenderer() }

vi.mock('@pixi/react', () => ({
  useApplication: () => ({ app: fakeApp, isInitialised: true, isInitialising: false }),
}))

describe('useScreenSize', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fakeApp.screen = { width: 1024, height: 768 }
    fakeApp.renderer = createFakeRenderer()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with the current app screen size', () => {
    const { result } = renderHook(() => useScreenSize())

    expect(result.current).toEqual({ width: 1024, height: 768 })
  })

  // Pixi's renderer emits its own 'resize' event once it has actually applied
  // the resize (as opposed to window's 'resize' event, which Pixi's own
  // ResizePlugin defers to the next animation frame) — this hook listens to
  // that instead of window's event to avoid reading a stale app.screen size.
  it('updates when the renderer emits its resize event', () => {
    const { result } = renderHook(() => useScreenSize())

    fakeApp.screen = { width: 800, height: 600 }

    act(() => {
      fakeApp.renderer.emit()
      vi.runAllTimers()
    })

    expect(result.current).toEqual({ width: 800, height: 600 })
  })
})
