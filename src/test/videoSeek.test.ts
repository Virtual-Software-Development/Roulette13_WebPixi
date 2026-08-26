import { describe, expect, it, vi } from 'vitest'
import { onVideoNearEnd } from '../utils/videoSeek'

function createFakeVideo(initialTime: number, duration: number) {
  const listeners: Record<string, Array<() => void>> = {}
  return {
    currentTime: initialTime,
    duration,
    addEventListener: vi.fn((event: string, handler: () => void) => {
      listeners[event] = listeners[event] ?? []
      listeners[event].push(handler)
    }),
    removeEventListener: vi.fn((event: string, handler: () => void) => {
      listeners[event] = (listeners[event] ?? []).filter((h) => h !== handler)
    }),
    dispatch(event: string) {
      for (const handler of listeners[event] ?? []) handler()
    },
  } as unknown as HTMLVideoElement & { dispatch: (event: string) => void }
}

// jsdom no implementa requestVideoFrameCallback/cancelVideoFrameCallback -- se simulan a mano
// como una cola FIFO de callbacks pendientes que el test dispara explícitamente, para poder
// controlar mediaTime callback a callback sin depender de timers reales.
function createFakeVideoWithFrameCallback(duration: number) {
  const listeners: Record<string, Array<() => void>> = {}
  const pending: Array<(now: number, metadata: VideoFrameCallbackMetadata) => void> = []
  let nextHandle = 1
  const cancelled = new Set<number>()

  const video = {
    duration,
    addEventListener: vi.fn((event: string, handler: () => void) => {
      listeners[event] = listeners[event] ?? []
      listeners[event].push(handler)
    }),
    removeEventListener: vi.fn(),
    requestVideoFrameCallback: vi.fn((cb: (now: number, metadata: VideoFrameCallbackMetadata) => void) => {
      const handle = nextHandle++
      pending.push(cb)
      return handle
    }),
    cancelVideoFrameCallback: vi.fn((handle: number) => {
      cancelled.add(handle)
    }),
  } as unknown as HTMLVideoElement

  return {
    video,
    cancelledHandles: cancelled,
    // Dispara el próximo callback pendiente con el mediaTime dado.
    fireNextFrame(mediaTime: number) {
      const cb = pending.shift()
      if (!cb) throw new Error('no hay ningún requestVideoFrameCallback pendiente')
      cb(0, { mediaTime } as VideoFrameCallbackMetadata)
    },
    pendingCount: () => pending.length,
    dispatchEnded() {
      for (const handler of listeners['ended'] ?? []) handler()
    },
  }
}

describe('onVideoNearEnd', () => {
  it('fallback sin requestVideoFrameCallback: dispara en el evento ended, una sola vez', () => {
    const video = createFakeVideo(0, 30)
    const onNearEnd = vi.fn()

    const cleanup = onVideoNearEnd(video, onNearEnd)
    video.dispatch('ended')
    video.dispatch('ended')

    expect(onNearEnd).toHaveBeenCalledTimes(1)
    cleanup()
  })

  it('con requestVideoFrameCallback: no dispara hasta que mediaTime entra en el margen del último frame', () => {
    const { video, fireNextFrame, pendingCount } = createFakeVideoWithFrameCallback(10)
    const onNearEnd = vi.fn()

    onVideoNearEnd(video, onNearEnd, 1 / 60)

    fireNextFrame(5)
    expect(onNearEnd).not.toHaveBeenCalled()
    expect(pendingCount()).toBe(1)

    fireNextFrame(9.9)
    expect(onNearEnd).not.toHaveBeenCalled()

    fireNextFrame(10 - 1 / 60)
    expect(onNearEnd).toHaveBeenCalledTimes(1)
    // Deja de pedir más callbacks una vez que dispara.
    expect(pendingCount()).toBe(0)
  })

  it('respaldo: dispara con \'ended\' aunque ningún callback de frame haya alcanzado el margen', () => {
    // Reproduce el bug real encontrado en vivo: el último callback antes de 'ended' puede quedar
    // por debajo del margen (redondeo de tiempos de frame), y sin este respaldo el código quedaba
    // esperando para siempre un callback que nunca llega porque el video ya dejó de reproducirse.
    const { video, fireNextFrame, dispatchEnded } = createFakeVideoWithFrameCallback(10)
    const onNearEnd = vi.fn()

    onVideoNearEnd(video, onNearEnd, 1 / 60)

    fireNextFrame(9.98) // por debajo del margen (10 - 1/60 ≈ 9.9833), pide otro callback...
    expect(onNearEnd).not.toHaveBeenCalled()
    // ...que nunca llega porque el video ya terminó -- 'ended' es lo único que queda para avisar.
    dispatchEnded()

    expect(onNearEnd).toHaveBeenCalledTimes(1)
  })

  it('la limpieza cancela el callback pendiente y evita que dispare después', () => {
    const { video, cancelledHandles, fireNextFrame } = createFakeVideoWithFrameCallback(10)
    const onNearEnd = vi.fn()

    const cleanup = onVideoNearEnd(video, onNearEnd, 1 / 60)
    cleanup()

    expect(cancelledHandles.size).toBe(1)

    // Aunque el callback ya pedido dispare igual (el navegador real no lo haría tras cancelar,
    // pero el mock no lo impide), el `cancelled` interno de onVideoNearEnd debe frenarlo.
    fireNextFrame(10)
    expect(onNearEnd).not.toHaveBeenCalled()
  })
})
