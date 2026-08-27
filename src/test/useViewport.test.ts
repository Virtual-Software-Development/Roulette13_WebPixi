import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useViewport } from '../hooks/useViewport'

const mockScreenSize = vi.fn()

vi.mock('../hooks/useScreenSize', () => ({
  useScreenSize: () => mockScreenSize(),
}))

describe('useViewport', () => {
  it('returns scale 1 and no offset when the screen matches the design resolution', () => {
    mockScreenSize.mockReturnValue({ width: 1920, height: 1080 })

    const { result } = renderHook(() => useViewport())

    expect(result.current).toEqual({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      visibleLeft: 0,
      visibleTop: 0,
      visibleRight: 1920,
      visibleBottom: 1080,
    })
  })

  it('scales down proportionally when the screen keeps the design aspect ratio', () => {
    mockScreenSize.mockReturnValue({ width: 960, height: 540 })

    const { result } = renderHook(() => useViewport())

    expect(result.current).toEqual({
      scale: 0.5,
      offsetX: 0,
      offsetY: 0,
      visibleLeft: 0,
      visibleTop: 0,
      visibleRight: 1920,
      visibleBottom: 1080,
    })
  })

  it('crops the axis that is not the constraint when the aspect ratio differs', () => {
    mockScreenSize.mockReturnValue({ width: 1080, height: 1080 })

    const { result } = renderHook(() => useViewport())

    expect(result.current.scale).toBe(1)
    expect(result.current.offsetX).toBeCloseTo(-420)
    expect(result.current.offsetY).toBe(0)
    expect(result.current.visibleLeft).toBeCloseTo(420)
    expect(result.current.visibleRight).toBeCloseTo(1500)
    expect(result.current.visibleTop).toBe(0)
    expect(result.current.visibleBottom).toBe(1080)
  })

  it('reports the visible rect for a portrait screen much narrower than the design', () => {
    mockScreenSize.mockReturnValue({ width: 900, height: 1200 })

    const { result } = renderHook(() => useViewport())

    expect(result.current.scale).toBeCloseTo(1.1111)
    expect(result.current.visibleLeft).toBeCloseTo(555, 0)
    expect(result.current.visibleRight).toBeCloseTo(1365, 0)
    expect(result.current.visibleTop).toBe(0)
    expect(result.current.visibleBottom).toBe(1080)
  })

  it('falls back to scale 1 with no offset before the screen size is known', () => {
    mockScreenSize.mockReturnValue({ width: 0, height: 0 })

    const { result } = renderHook(() => useViewport())

    expect(result.current).toEqual({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      visibleLeft: 0,
      visibleTop: 0,
      visibleRight: 1920,
      visibleBottom: 1080,
    })
  })
})
