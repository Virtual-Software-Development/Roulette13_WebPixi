import { afterEach, describe, expect, it, vi } from 'vitest'
import { pickRandomDrawResultVideoUrl } from '../utils/media'

// Fake /media-list/Videos/{n}: number 17 has five clips plus a non-video sidecar, 37 ("00") has
// its own clip, and 12 has clips that must never be used for another number.
const LIBRARY: Record<string, string[]> = {
  'Videos/17': ['r17_a.mp4', 'r17_b.mp4', 'r17_c.mp4', 'r17_d.mp4', 'r17_e.mp4', 'r17_a.spins.json'],
  'Videos/37': ['r37_a.mp4'],
  'Videos/12': ['r12_a.mp4'],
}

function mockMediaList() {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const dir = decodeURIComponent(url.replace('/media-list/', ''))
    const files = LIBRARY[dir]
    return files
      ? new Response(JSON.stringify(files), { status: 200 })
      : new Response('not found', { status: 404 })
  }))
}

describe('pickRandomDrawResultVideoUrl', () => {
  afterEach(() => vi.unstubAllGlobals())

  it("always picks one of the result's own clips, and every clip gets picked", async () => {
    mockMediaList()
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const url = decodeURIComponent(await pickRandomDrawResultVideoUrl(17))
      expect(url).toMatch(/^\/media\/Videos\/17\/r17_[a-e]\.mp4$/)
      seen.add(url)
    }
    expect(seen.size).toBe(5)
  })

  it('uses the "00" folder (37) for 00', async () => {
    mockMediaList()
    expect(decodeURIComponent(await pickRandomDrawResultVideoUrl(37))).toBe('/media/Videos/37/r37_a.mp4')
  })

  it("never falls back to another number's clip", async () => {
    mockMediaList()
    await expect(pickRandomDrawResultVideoUrl(5)).rejects.toThrow('5')
  })
})
