import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shouldResync } from '../hooks/useQuickMoneyEventSync'
import { syncServerClock } from '../time/serverClock'

describe('Quick Money round sync over MQTT', () => {
  it('re-reads the open draw only when it can have changed', () => {
    expect(shouldResync({ estado: 'sugerido', eventId: 8 }, 7)).toBe(true)
    expect(shouldResync({ estado: 'en_curso', eventId: 7 }, 7)).toBe(true)
    expect(shouldResync({ estado: 'congelado', eventId: 7 }, 7)).toBe(false)
    expect(shouldResync({ estado: 'liquidado', eventId: 6 }, 7)).toBe(false)
    // A draw the page does not show (e.g. the retained message after a reconnection).
    expect(shouldResync({ estado: 'congelado', eventId: 8 }, 7)).toBe(true)
    expect(shouldResync('nope', 7)).toBe(true)
  })
})

describe('server clock sampling', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('stops at the first sample with a small round trip', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ serverTimeMs: Date.now() })))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(await syncServerClock()).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps sampling while the round trips are slow', async () => {
    const fetchMock = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 30))
      return new Response(JSON.stringify({ serverTimeMs: Date.now() }))
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(await syncServerClock()).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })
})

describe('backend monitor with the MQTT status', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  async function start() {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const monitor = await import('../network/backendMonitor')
    monitor.startBackendMonitor()
    await vi.advanceTimersByTimeAsync(0)
    return { monitor, fetchMock }
  }

  it('asks /readyz every 10 s without the status, every 60 s while it keeps arriving', async () => {
    const { monitor, fetchMock } = await start()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    monitor.onBackendStatus({ ready: true })
    await vi.advanceTimersByTimeAsync(10_000) // the pending 10 s check, which now schedules 60 s
    expect(fetchMock).toHaveBeenCalledTimes(3)
    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(10_000)
      monitor.onBackendStatus({ ready: true })
    }
    expect(fetchMock).toHaveBeenCalledTimes(4) // one safety check in those 60 s
  })

  it('checks at once when the backend says it is down or the status stops', async () => {
    const { monitor, fetchMock } = await start()
    monitor.onBackendStatus({ ready: true })
    monitor.onBackendStatus({ ready: false })
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    monitor.onBackendStatus({ ready: true })
    await vi.advanceTimersByTimeAsync(24_999) // the 10 s check already due, then 60 s
    const before = fetchMock.mock.calls.length
    await vi.advanceTimersByTimeAsync(1) // no status for 25 s: checks right then
    expect(fetchMock).toHaveBeenCalledTimes(before + 1)
  })
})
