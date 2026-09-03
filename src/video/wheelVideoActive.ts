const SWAP_EVENT = 'wheel-video-active-swap'

// Fuente única de "cuál <video> de la rueda es el visible ahora" -- ver
// hooks/useSeamlessVideoLoop.ts, que es el único que llama notifyWheelVideoSwap tras mutar
// data-wheel-video-active. Los consumidores por-frame (useWheelVideoPocketGeometry.ts,
// useWheelVideoRigidRotationSync.ts) NO pueden guardarse el elemento una sola vez al montar --
// el doble-video cambia cuál es el activo cada ~7s (ver useSeamlessVideoLoop.ts), así que hay que
// re-consultar el DOM cada vez que eso pasa, no asumir que el elemento capturado al montar sigue
// siendo el correcto para siempre (si se queda con el que pasó a estar pausado, su
// requestVideoFrameCallback deja de disparar y lo que dependa de eso se congela en el momento del
// primer swap).
export function getActiveWheelVideoElement(): HTMLVideoElement | null {
  return document.querySelector<HTMLVideoElement>('.lobby-wheel-video[data-wheel-video-active="true"]')
}

export function notifyWheelVideoSwap(): void {
  document.dispatchEvent(new Event(SWAP_EVENT))
}

export function onWheelVideoSwap(callback: () => void): () => void {
  document.addEventListener(SWAP_EVENT, callback)
  return () => document.removeEventListener(SWAP_EVENT, callback)
}
