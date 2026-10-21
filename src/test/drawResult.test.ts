import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchDrawResult } from '../api/drawResult'

vi.mock('../time/serverClock', () => ({ serverNow: () => Date.now() }))

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

const RESULT = { msgType: 'drawResult', drawNo: '0042', result: 17, video: 2 }

describe('fetchDrawResult', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('keeps asking past the fixed attempts while the deadline allows (result generated late)', async () => {
    vi.useFakeTimers()
    let calls = 0
    vi.stubGlobal('fetch', vi.fn(async () => (++calls < 15 ? json({ error: 'not drawn' }, 409) : json(RESULT))))

    const done = fetchDrawResult('0042', { until: Date.now() + 10_000 })
    await vi.advanceTimersByTimeAsync(10_000)

    await expect(done).resolves.toMatchObject({ result: 17 })
    expect(calls).toBe(15)
  })

  it('retries a backend that is down (request fails) until it answers', async () => {
    vi.useFakeTimers()
    let calls = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      if (++calls < 4) throw new TypeError('Failed to fetch')
      return json(RESULT)
    }))

    const done = fetchDrawResult('0042', { until: Date.now() + 5_000 })
    await vi.advanceTimersByTimeAsync(5_000)

    await expect(done).resolves.toMatchObject({ result: 17 })
  })

  it('gives up at the deadline when the result never comes', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'not drawn' }, 409)))

    const done = fetchDrawResult('0042', { until: Date.now() + 3_000 })
    const settled = expect(done).rejects.toThrow('409')
    await vi.advanceTimersByTimeAsync(4_000)
    await settled
  })

  it('without a deadline keeps the old behaviour: a few 409 retries, no retry when unreachable', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(async () => json({ error: 'not drawn' }, 409))
    vi.stubGlobal('fetch', fetchMock)
    const done = fetchDrawResult('0042')
    const settled = expect(done).rejects.toThrow('409')
    await vi.advanceTimersByTimeAsync(5_000)
    await settled
    expect(fetchMock).toHaveBeenCalledTimes(8)

    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }))
    await expect(fetchDrawResult('0042')).rejects.toThrow('Failed to fetch')
  })
})
