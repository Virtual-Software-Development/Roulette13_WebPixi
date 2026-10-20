import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startDrawVideoPlayback } from '../video/drawVideoMonitor'

// <video> mínimo: currentTime avanza con el reloj falso mientras reproduce, y cada avance "pinta"
// un cuadro (requestVideoFrameCallback) salvo que se simule el caso sin imagen.
function fakeVideo({ duration = 18, paintsFrames = true } = {}) {
  let frameCallbacks: Array<() => void> = []
  const video = {
    duration,
    currentTime: 0,
    paused: true,
    ended: false,
    muted: false,
    error: null as MediaError | null,
    videoWidth: 986,
    play: vi.fn(async () => {
      video.paused = false
    }),
    pause: vi.fn(() => {
      video.paused = true
    }),
    requestVideoFrameCallback: vi.fn((cb: () => void) => {
      frameCallbacks.push(cb)
      return frameCallbacks.length
    }),
    cancelVideoFrameCallback: vi.fn(),
    getVideoPlaybackQuality: () => ({ totalVideoFrames: 100, droppedVideoFrames: 0 }),
    // Avanza `ms` de reproducción en pasos de un cuadro.
    advance(ms: number) {
      for (let t = 0; t < ms; t += 50) {
        if (!video.paused) video.currentTime += 0.05
        if (paintsFrames && !video.paused) {
          const pending = frameCallbacks
          frameCallbacks = []
          pending.forEach((cb) => cb())
        }
        vi.advanceTimersByTime(50)
      }
    },
  }
  return video
}

describe('startDrawVideoPlayback', () => {
  let now = 0
  const clock = () => now

  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('a machine that arrives late jumps to where the others are instead of starting from 0', async () => {
    const video = fakeVideo()
    now = 2_000 // el clip arrancó en todas las demás hace 2 s
    const stop = startDrawVideoPlayback(video as unknown as HTMLVideoElement, { playStartAt: 0, revealLeadSeconds: 2, onFail: vi.fn(), now: clock })
    expect(video.currentTime).toBeCloseTo(2, 2)
    expect(video.play).toHaveBeenCalled()
    stop()
  })

  it('waits for the absolute start time if it is early', () => {
    const video = fakeVideo()
    now = 0
    const stop = startDrawVideoPlayback(video as unknown as HTMLVideoElement, { playStartAt: 500, revealLeadSeconds: 2, onFail: vi.fn(), now: clock })
    expect(video.play).not.toHaveBeenCalled()
    now = 500
    vi.advanceTimersByTime(500)
    expect(video.play).toHaveBeenCalled()
    expect(video.currentTime).toBe(0)
    stop()
  })

  it('gives up when it would start practically on the result', () => {
    const video = fakeVideo({ duration: 18 })
    const onFail = vi.fn()
    now = 15_500 // revelación en 16 s: quedaría medio segundo de video
    startDrawVideoPlayback(video as unknown as HTMLVideoElement, { playStartAt: 0, revealLeadSeconds: 2, onFail, now: clock })
    expect(onFail).toHaveBeenCalledWith('tooLate')
    expect(video.play).not.toHaveBeenCalled()
  })

  it('detects audio without picture: mutes, pauses and reports noPicture', async () => {
    const video = fakeVideo({ paintsFrames: false })
    const onFail = vi.fn()
    now = 0
    startDrawVideoPlayback(video as unknown as HTMLVideoElement, { playStartAt: 0, revealLeadSeconds: 2, onFail, now: () => now })
    await Promise.resolve()
    for (let i = 0; i < 40 && !onFail.mock.calls.length; i++) {
      now += 50
      video.advance(50)
    }
    expect(onFail).toHaveBeenCalledWith('noPicture')
    expect(video.muted).toBe(true)
    expect(video.pause).toHaveBeenCalled()
  })

  it('pulls the video back in line when it falls behind the server clock', async () => {
    const video = fakeVideo()
    const onFail = vi.fn()
    now = 0
    const stop = startDrawVideoPlayback(video as unknown as HTMLVideoElement, { playStartAt: 0, revealLeadSeconds: 2, onFail, now: () => now })
    await Promise.resolve()
    // 2 s de reproducción normal, y después la máquina se traba 1 s (el reloj sigue, el video no).
    for (let i = 0; i < 40; i++) {
      now += 50
      video.advance(50)
    }
    video.paused = true
    now += 1000
    vi.advanceTimersByTime(1000)
    video.paused = false
    for (let i = 0; i < 4; i++) {
      now += 50
      video.advance(50)
    }
    expect(onFail).not.toHaveBeenCalled()
    expect(Math.abs(video.currentTime - now / 1000)).toBeLessThan(0.4)
    stop()
  })

  it('a video that never starts is reported as stalled, not as audio without picture', async () => {
    const video = fakeVideo()
    video.play = vi.fn(async () => {}) // play() resuelve pero el video nunca avanza (p.ej. diferido)
    const onFail = vi.fn()
    now = 0
    startDrawVideoPlayback(video as unknown as HTMLVideoElement, { playStartAt: 0, revealLeadSeconds: 2, onFail, now: () => now })
    await Promise.resolve()
    for (let i = 0; i < 100 && !onFail.mock.calls.length; i++) {
      now += 50
      video.advance(50)
    }
    expect(onFail).toHaveBeenCalledWith('stalled')
  })

  it('reports a decode error during playback', async () => {
    const video = fakeVideo()
    const onFail = vi.fn()
    now = 0
    startDrawVideoPlayback(video as unknown as HTMLVideoElement, { playStartAt: 0, revealLeadSeconds: 2, onFail, now: () => now })
    await Promise.resolve()
    video.error = { code: 3 } as MediaError
    now += 300
    video.advance(300)
    expect(onFail).toHaveBeenCalledWith('error')
  })
})
