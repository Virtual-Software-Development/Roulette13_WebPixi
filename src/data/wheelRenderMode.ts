import type { WheelType } from '../types/wheel'

export type WheelRenderMode = 'image' | 'video'

// Modo de render activo para la rueda del lobby -- fijo por código (no runtime, no prop).
// Cambiar acá para probar el modo video mientras se calibra WHEEL_VIDEO_GEOMETRY
// (ver layout/wheelVideoGeometry.constants.ts).
export const ACTIVE_WHEEL_RENDER_MODE: WheelRenderMode = 'image'

// Qué tipos de rueda tienen video disponible -- hoy solo la americana
// (local-media/Lobby/lobby_loop_american.webm). Agregar 'european: true' acá el día que
// exista su propio video, sin tocar el resto de este archivo ni a los consumidores.
const WHEEL_VIDEO_AVAILABILITY: Partial<Record<WheelType, true>> = {
  american: true,
}

// Modo efectivo para un tipo de rueda dado -- cae a 'image' automáticamente si ese tipo no
// tiene video todavía, para que dejar ACTIVE_WHEEL_RENDER_MODE en 'video' y cambiar
// ACTIVE_WHEEL_TYPE a un tipo sin video (ver data/wheelOrder.ts) no rompa nada.
export function getEffectiveWheelRenderMode(wheelType: WheelType): WheelRenderMode {
  return ACTIVE_WHEEL_RENDER_MODE === 'video' && WHEEL_VIDEO_AVAILABILITY[wheelType] ? 'video' : 'image'
}
