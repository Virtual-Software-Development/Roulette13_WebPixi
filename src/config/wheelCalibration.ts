function readDebugParam(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('debug')
}

const DEBUG_PARAM = readDebugParam()

// Habilita WheelFrameStepper.tsx (controles para mover el video de la rueda cuadro a cuadro) --
// se activa con ?debug=full o ?debug=stepping en la URL, sin tocar código. Los dos valores
// habilitan lo mismo por ahora (no hay todavía una diferencia de comportamiento entre "full" y
// "stepping"). Solo tiene efecto en dev.
export const WHEEL_FRAME_STEPPER_ENABLED = import.meta.env.DEV && (DEBUG_PARAM === 'full' || DEBUG_PARAM === 'stepping')

// True si el video de la rueda debe arrancar pausado en vez de reproducirse -- fuente única para
// LobbyBackgroundLayer.tsx (pausa el <video> en el frame 0 en vez de reproducirlo) y App.tsx
// (bloquea el timer que dispara la escena de juego, para no perder el frame que se está
// comparando a mitad de una sesión de calibración). Atado únicamente a
// WHEEL_FRAME_STEPPER_ENABLED (el param de URL) -- no hay ningún otro camino para pausar el
// video: sin ?debug=full/stepping, el video reproduce normalmente.
// No hace falta pausar los diamantes por separado: su rotación se deriva enteramente de
// video.currentTime/el frame real que pinta el <video> (ver useWheelVideoRigidRotationSync.ts /
// useWheelVideoPocketGeometry.ts, usados por WheelRotorGroup), así que un video pausado ya
// implica que todo lo que cuelga de WheelRotorGroup deja de moverse también.
export const WHEEL_VIDEO_FROZEN = WHEEL_FRAME_STEPPER_ENABLED
