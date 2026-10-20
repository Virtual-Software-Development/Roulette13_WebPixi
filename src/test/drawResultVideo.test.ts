import { describe, expect, it } from 'vitest'
import { drawResultVideoUrl } from '../utils/media'

// Every machine must play the clip the backend chose for the round (/drawResult videoFile), so they
// all show the same video -- never one picked on the machine.
describe('drawResultVideoUrl', () => {
  it("plays the backend's clip from the result's folder", () => {
    expect(decodeURIComponent(drawResultVideoUrl(17, 'roulette_17_varC.mp4'))).toBe('/media/Videos/17/roulette_17_varC.mp4')
  })

  it('uses the "00" folder (37) for 00', () => {
    expect(decodeURIComponent(drawResultVideoUrl(37, 'roulette_37_varA.mp4'))).toBe('/media/Videos/37/roulette_37_varA.mp4')
  })

  it('is the same on every call (no random choice on the machine)', () => {
    const first = drawResultVideoUrl(9, 'roulette_9_varG.mp4')
    for (let i = 0; i < 50; i++) expect(drawResultVideoUrl(9, 'roulette_9_varG.mp4')).toBe(first)
  })

  it("refuses to pick one itself when the backend didn't choose", () => {
    expect(() => drawResultVideoUrl(5)).toThrow('5')
    expect(() => drawResultVideoUrl(5, '')).toThrow()
  })

  it('refuses names that are not a plain file name', () => {
    expect(() => drawResultVideoUrl(5, '../12/roulette_12_varA.mp4')).toThrow()
    expect(() => drawResultVideoUrl(5, 'sub/roulette_5_varA.mp4')).toThrow()
  })
})
