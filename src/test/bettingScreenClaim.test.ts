import { describe, expect, it } from 'vitest'
import { createBettingScreenClaim, type ChannelLike } from '../network/bettingScreenClaim'

// Windows of the same origin: each message reaches every other channel, synchronously.
function hub() {
  const channels: ChannelLike[] = []
  return () => {
    const channel: ChannelLike = {
      onmessage: null,
      postMessage(message) {
        for (const other of channels) if (other !== channel) other.onmessage?.(new MessageEvent('message', { data: structuredClone(message) }))
      },
      close() {
        channels.splice(channels.indexOf(channel), 1)
      },
    }
    channels.push(channel)
    return channel
  }
}

function openWindow(open: () => ChannelLike, at: number) {
  const state = { active: true }
  const claim = createBettingScreenClaim(open(), (active) => (state.active = active), () => at)
  return { state, claim }
}

describe('one betting screen at a time', () => {
  it('the newest window takes it and the older one yields', () => {
    const open = hub()
    const first = openWindow(open, 1000)
    const second = openWindow(open, 2000)
    expect(first.state.active).toBe(false)
    expect(second.state.active).toBe(true)
  })

  it('"Use here" takes it back', () => {
    const open = hub()
    const first = openWindow(open, 1000)
    const second = openWindow(open, 2000)
    first.claim.takeOver()
    expect(first.state.active).toBe(true)
    expect(second.state.active).toBe(false)
  })

  it('a window whose claim is older than the holder yields even if it announced last', () => {
    const open = hub()
    const newer = openWindow(open, 2000)
    const older = openWindow(open, 1000) // e.g. a slow start: it announces after the newer one
    expect(newer.state.active).toBe(true)
    expect(older.state.active).toBe(false)
  })

  it('only one of three stays active, and a closed window no longer counts', () => {
    const open = hub()
    const windows = [openWindow(open, 1000), openWindow(open, 2000), openWindow(open, 3000)]
    expect(windows.map((w) => w.state.active)).toEqual([false, false, true])
    windows[2].claim.release()
    windows[0].claim.takeOver()
    expect(windows.map((w) => w.state.active)).toEqual([true, false, true])
  })

  it('ignores unrelated messages', () => {
    const open = hub()
    const only = openWindow(open, 1000)
    open().postMessage({ type: 'other' })
    open().postMessage('nope')
    expect(only.state.active).toBe(true)
  })
})
