import { create } from 'zustand'

interface WheelVideoFrameState {
  // Tiempo real (mediaTime, no video.currentTime) del último frame REAL pintado por
  // .lobby-wheel-video -- ver video/wheelVideoFrameDriver.ts, que es lo único que escribe acá.
  // Crudo (sin fps ni frameIndex) para que cualquier WheelVideoGeometry (hoy solo american, a
  // futuro también european con su propio fps/duración) pueda resolver su propio frameIndex sin
  // acoplar este store a una geometría en particular.
  mediaTimeSec: number
}

export const useWheelVideoFrameStore = create<WheelVideoFrameState>(() => ({
  mediaTimeSec: 0,
}))
