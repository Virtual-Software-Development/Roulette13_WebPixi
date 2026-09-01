import { useLayoutEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import type { WheelVideoGeometry } from '../layout/wheelVideoGeometry.constants'
import type { PocketGeometry } from '../utils/wheelPositions'

// Reemplaza a la versión anterior de este hook (que aplicaba una rotación uniforme sobre una
// única tabla de ángulos) -- el video tiene perspectiva real y la separación entre casillas
// cambia con el tiempo (ver el comentario largo en wheelVideoGeometry.constants.ts), así que no
// alcanza con "girar" una tabla fija: hay que resolver la tabla MEDIDA para el frame que está
// pintando el <video> en cada instante.
function resolveGeometry(video: WheelVideoGeometry, mediaTimeSec: number): PocketGeometry {
  const frameCount = video.pocketAngleDegByFrame.length
  // % dos veces por si mediaTimeSec cae justo en el borde del loop (currentTime === duration
  // antes de reiniciar) y por seguridad ante valores negativos.
  const frameIndex = ((Math.round(mediaTimeSec * video.fps) % frameCount) + frameCount) % frameCount
  return { center: video.center, radius: video.radius, pocketAngleDeg: video.pocketAngleDegByFrame[frameIndex] }
}

// video.requestVideoFrameCallback (no requestAnimationFrame) a propósito -- mismo criterio que
// onVideoNearEnd (utils/videoSeek.ts): dispara una sola vez por cada frame REAL pintado, con
// mediaTime ya resuelto en la metadata, así que el frameIndex calculado siempre corresponde al
// frame que el usuario está viendo en ese instante (rAF podría leer video.currentTime antes de
// que el frame nuevo se pinte y repetir el mismo índice, o saltarse uno).
//
// setGeometry va envuelto en flushSync a propósito: sin esto, React agenda el re-render para
// más adelante (el siguiente tick de su scheduler), y a ~45°/s ese retraso -- aunque sea de un
// frame o dos -- se ve como que los puntos van sistemáticamente "atrasados" respecto al video
// real (mismo síntoma que el desfasaje de calibración, pero acá la causa es latencia de render,
// no la tabla de datos). flushSync fuerza a que el commit de React (recalcular los 38
// transform="translate(...) rotate(...)") pase en el mismo tick que el frame real del video, sin
// esperar al scheduler.
//
// Busca el <video class="lobby-wheel-video"> por selector, mismo patrón que useWheelRotationSync
// usa para '.lobby-wheel-rotor'.
export function useWheelVideoPocketGeometry(video: WheelVideoGeometry): PocketGeometry {
  const [geometry, setGeometry] = useState<PocketGeometry>(() => resolveGeometry(video, 0))

  useLayoutEffect(() => {
    const videoEl = document.querySelector<HTMLVideoElement>('.lobby-wheel-video')
    if (!videoEl) return

    if (typeof videoEl.requestVideoFrameCallback !== 'function') {
      // Fallback defensivo -- no se espera este caso en el navegador de este kiosco (Chrome/Edge),
      // ver mismo criterio en onVideoNearEnd (utils/videoSeek.ts).
      let handle: number
      function tick() {
        flushSync(() => setGeometry(resolveGeometry(video, videoEl!.currentTime)))
        handle = requestAnimationFrame(tick)
      }
      handle = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(handle)
    }

    let cancelled = false
    let vfcHandle: number
    function tick(_now: DOMHighResTimeStamp, metadata: VideoFrameCallbackMetadata) {
      if (cancelled) return
      flushSync(() => setGeometry(resolveGeometry(video, metadata.mediaTime)))
      vfcHandle = videoEl!.requestVideoFrameCallback(tick)
    }
    vfcHandle = videoEl.requestVideoFrameCallback(tick)

    return () => {
      cancelled = true
      videoEl.cancelVideoFrameCallback(vfcHandle)
    }
  }, [video])

  return geometry
}
