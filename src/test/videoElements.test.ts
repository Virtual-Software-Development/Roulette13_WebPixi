import { afterEach, describe, expect, it, vi } from 'vitest'
import { getVideoSlot, loadVideoSrc } from '../video/videoElements'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('getVideoSlot', () => {
  it('returns the video element when present', () => {
    const video = document.createElement('video')
    video.id = 'test-slot'
    document.body.appendChild(video)

    expect(getVideoSlot('test-slot')).toBe(video)
  })

  it('throws a descriptive error when the slot is missing', () => {
    expect(() => getVideoSlot('missing-slot')).toThrow(/VideoPoolLayer/)
  })
})

describe('loadVideoSrc', () => {
  it('resolves once loadedmetadata fires', async () => {
    const video = document.createElement('video')
    document.body.appendChild(video)

    const promise = loadVideoSrc(video, '/media/test.webm')
    video.dispatchEvent(new Event('loadedmetadata'))

    await expect(promise).resolves.toBeUndefined()
  })

  it('rejects on error', async () => {
    const video = document.createElement('video')
    document.body.appendChild(video)

    const promise = loadVideoSrc(video, '/media/test.webm')
    promise.catch(() => {}) // evita el warning de unhandled rejection mientras se dispara el evento
    video.dispatchEvent(new Event('error'))

    await expect(promise).rejects.toThrow()
  })

  it('resolves immediately without touching src/load() if already loaded with the same url', async () => {
    const video = document.createElement('video')
    document.body.appendChild(video)
    const url = '/media/test.webm'
    Object.defineProperty(video, 'currentSrc', {
      value: new URL(url, window.location.href).href,
      configurable: true,
    })
    Object.defineProperty(video, 'readyState', {
      value: HTMLMediaElement.HAVE_METADATA,
      configurable: true,
    })
    const loadSpy = vi.spyOn(video, 'load').mockImplementation(() => {})

    await loadVideoSrc(video, url)

    expect(loadSpy).not.toHaveBeenCalled()
  })
})
