// Dispara onNearEnd tan cerca como sea posible del último frame REAL pintado por el video, en
// vez de esperar al evento 'ended' -- 'ended' no tiene garantía de spec de ser preciso al frame,
// y le suma el ciclo de React (setState -> re-render -> efecto) más la contención del hilo
// principal con el loop de renderizado de Pixi. Cuando el video sigue girando a velocidad
// constante hasta su último frame (sin frenar en cámara, caso real de esta app), cualquier
// demora ahí se ve como un salto de varios grados en el hand-off.
//
// requestVideoFrameCallback se dispara junto con el compositor en cada frame realmente pintado
// (no en un timer aparte), así que es mucho más ajustado. Se pide callback por callback (no un
// loop de polling) y se deja de pedir más apenas se dispara onNearEnd, para no seguir compitiendo
// por el hilo principal después del hand-off.
//
// 'ended' SIEMPRE queda escuchado también, como respaldo garantizado -- no sólo como fallback de
// compatibilidad. Se comprobó en vivo que el último callback antes de que el video termine puede
// no alcanzar el margen (`mediaTime >= duration - leadSeconds`) por redondeo de los tiempos de
// frame (con 1015 frames a 60fps, el mediaTime del último frame decodificado quedó unas
// diezmilésimas de segundo por DEBAJO del margen calculado) -- en ese caso el código pedía "un
// callback más" que nunca llega porque el video ya dejó de reproducirse, y onNearEnd no se
// disparaba nunca. 'ended' como respaldo asegura que siempre dispare, en el peor caso con la
// misma precisión que antes de este cambio.
export function onVideoNearEnd(video: HTMLVideoElement, onNearEnd: () => void, leadSeconds = 1 / 60): () => void {
  let fired = false
  function fire() {
    if (fired) return
    fired = true
    onNearEnd()
  }

  video.addEventListener('ended', fire)

  if (typeof video.requestVideoFrameCallback !== 'function') {
    // Fallback defensivo -- no se espera este caso en el navegador de este kiosco (Chrome/Edge),
    // pero evita romper si algún día corre en otro motor. 'ended' de arriba ya cubre este caso.
    return () => video.removeEventListener('ended', fire)
  }

  let cancelled = false
  let handle: number | undefined

  function tick(_now: DOMHighResTimeStamp, metadata: VideoFrameCallbackMetadata) {
    if (cancelled || fired) return
    if (metadata.mediaTime >= video.duration - leadSeconds) {
      fire()
      return
    }
    handle = video.requestVideoFrameCallback(tick)
  }

  handle = video.requestVideoFrameCallback(tick)

  return () => {
    cancelled = true
    video.removeEventListener('ended', fire)
    if (handle !== undefined) video.cancelVideoFrameCallback(handle)
  }
}
