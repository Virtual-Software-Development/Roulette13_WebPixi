import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchVideoFilesForNumber', () => {
  it('filtra el listado a extensiones de video, sin incluir el .spins.json', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(['12_0.webm', 'roulette_20260824_143335_353.spins.json']))
    )

    const { fetchVideoFilesForNumber } = await import('../utils/media')
    const files = await fetchVideoFilesForNumber(12)

    expect(files).toEqual(['12_0.webm'])
  })
})
