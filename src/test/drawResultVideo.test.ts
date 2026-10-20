import { afterEach, describe, expect, it, vi } from 'vitest'
import { pickDrawResultVideoUrl } from '../utils/media'

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

describe('pickDrawResultVideoUrl', () => {
  afterEach(() => vi.unstubAllGlobals())

  it("always picks one of the result's own clips, and different draws use every clip", async () => {
    mockMediaList()
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const url = decodeURIComponent(await pickDrawResultVideoUrl(17, null, `draw-${i}`))
      expect(url).toMatch(/^\/media\/Videos\/17\/r17_[a-e]\.mp4$/)
      seen.add(url)
    }
    expect(seen.size).toBe(5)
  })

  it('picks the same clip for the same draw, whatever order the server lists the files in', async () => {
    mockMediaList()
    const first = await pickDrawResultVideoUrl(17, null, '1792427999479-0042')
    LIBRARY['Videos/17'] = [...LIBRARY['Videos/17']].reverse()
    for (let i = 0; i < 10; i++) expect(await pickDrawResultVideoUrl(17, null, '1792427999479-0042')).toBe(first)
  })

  it("uses the backend's variant (1-based) over the clips sorted by name, whatever the listing order", async () => {
    mockMediaList()
    LIBRARY['Videos/17'] = ['r17_d.mp4', 'r17_b.mp4', 'r17_e.mp4', 'r17_a.mp4', 'r17_c.mp4', 'r17_a.spins.json']
    expect(decodeURIComponent(await pickDrawResultVideoUrl(17, 1, 'x'))).toBe('/media/Videos/17/r17_a.mp4')
    expect(decodeURIComponent(await pickDrawResultVideoUrl(17, 4, 'x'))).toBe('/media/Videos/17/r17_d.mp4')
    // Fuera de rango (librería con menos clips): cae al hash, pero siempre un clip del número.
    expect(decodeURIComponent(await pickDrawResultVideoUrl(17, 9, 'x'))).toMatch(/^\/media\/Videos\/17\/r17_[a-e]\.mp4$/)
  })

  it('uses the "00" folder (37) for 00', async () => {
    mockMediaList()
    expect(decodeURIComponent(await pickDrawResultVideoUrl(37, null, 'any'))).toBe('/media/Videos/37/r37_a.mp4')
  })

  it("never falls back to another number's clip", async () => {
    mockMediaList()
    await expect(pickDrawResultVideoUrl(5, 1, 'any')).rejects.toThrow('5')
  })
})
