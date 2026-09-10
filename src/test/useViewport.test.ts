import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useViewport } from '../hooks/useViewport'
import { DESIGN_HEIGHT, DESIGN_WIDTH, HEADER_BAR_HEIGHT_PX } from '../layout/layout.constants'

const mockScreenSize = vi.fn()

vi.mock('../hooks/useScreenSize', () => ({
  useScreenSize: () => mockScreenSize(),
}))

// Los valores esperados se derivan de HEADER_BAR_HEIGHT_PX (no hardcodeados) para que un cambio
// de altura del header (ver layout/header.css) no rompa este test -- el header DOM reserva esa
// franja real arriba de todo, el cover-fit se calcula contra (height - HEADER_BAR_HEIGHT_PX), y
// el resultado se corre esa misma cantidad hacia abajo.
function expectedViewport(width: number, height: number) {
  const usableHeight = Math.max(0, height - HEADER_BAR_HEIGHT_PX)
  const scale = Math.max(width / DESIGN_WIDTH, usableHeight / DESIGN_HEIGHT)
  const offsetX = (width - DESIGN_WIDTH * scale) / 2
  const offsetYWithinUsable = (usableHeight - DESIGN_HEIGHT * scale) / 2
  const offsetY = HEADER_BAR_HEIGHT_PX + offsetYWithinUsable

  return {
    scale,
    offsetX,
    offsetY,
    visibleLeft: -offsetX / scale || 0,
    visibleTop: -offsetYWithinUsable / scale || 0,
    visibleRight: (width - offsetX) / scale,
    visibleBottom: (usableHeight - offsetYWithinUsable) / scale,
  }
}

describe('useViewport', () => {
  it('reserves the header strip and cover-fits the remaining height when the screen matches the design resolution', () => {
    mockScreenSize.mockReturnValue({ width: 1920, height: 1080 })

    const { result } = renderHook(() => useViewport())

    expect(result.current).toEqual(expectedViewport(1920, 1080))
  })

  it('scales down proportionally when the screen keeps the design aspect ratio', () => {
    mockScreenSize.mockReturnValue({ width: 960, height: 540 })

    const { result } = renderHook(() => useViewport())

    expect(result.current).toEqual(expectedViewport(960, 540))
  })

  it('crops the axis that is not the constraint when the aspect ratio differs', () => {
    mockScreenSize.mockReturnValue({ width: 1080, height: 1080 })

    const { result } = renderHook(() => useViewport())
    const expected = expectedViewport(1080, 1080)

    expect(result.current.scale).toBeCloseTo(expected.scale)
    expect(result.current.offsetX).toBeCloseTo(expected.offsetX)
    expect(result.current.offsetY).toBeCloseTo(expected.offsetY)
    expect(result.current.visibleLeft).toBeCloseTo(expected.visibleLeft, 0)
    expect(result.current.visibleRight).toBeCloseTo(expected.visibleRight, 0)
    expect(result.current.visibleTop).toBe(0)
    expect(result.current.visibleBottom).toBe(1080)
  })

  it('reports the visible rect for a portrait screen much narrower than the design', () => {
    mockScreenSize.mockReturnValue({ width: 900, height: 1200 })

    const { result } = renderHook(() => useViewport())
    const expected = expectedViewport(900, 1200)

    expect(result.current.scale).toBeCloseTo(expected.scale)
    expect(result.current.offsetY).toBeCloseTo(expected.offsetY)
    expect(result.current.visibleLeft).toBeCloseTo(expected.visibleLeft, 0)
    expect(result.current.visibleRight).toBeCloseTo(expected.visibleRight, 0)
    expect(result.current.visibleTop).toBeCloseTo(0)
    expect(result.current.visibleBottom).toBeCloseTo(1080)
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
