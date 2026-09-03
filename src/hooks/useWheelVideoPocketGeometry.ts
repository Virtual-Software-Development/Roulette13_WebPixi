import { useLayoutEffect, useState } from 'react'
import type { WheelVideoGeometry } from '../layout/wheelVideoGeometry.constants'
import type { PocketGeometry } from '../utils/wheelPositions'
import { getActiveWheelVideoElement, onWheelVideoSwap } from '../video/wheelVideoActive'

// Cuántos requestVideoFrameCallback reales se dejan pasar entre cada recálculo/commit de
// geometría -- 1 = recalcula en todos los frames (comportamiento anterior), 2 = uno sí uno no,
// etc. En low-end devices, forzar un commit de React (36+ transforms de diamantes + sus filtros
// SVG) en TODOS los frames reales del video es lo que compite por el mismo hilo principal que
// necesita el propio <video> para no trabarse. Saltear frames alternados reduce ese trabajo a la
// mitad sin que el desfasaje visual entre el video y los diamantes sea perceptible (a ~45°/s de
// giro, un frame de diferencia en un video de 30-60fps es sub-grado).
const VIDEO_GEOMETRY_FRAME_SKIP = 2

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
// setGeometry ya NO va envuelto en flushSync (a diferencia de una versión anterior de este
// hook): forzar un commit síncrono de React en todos y cada uno de los frames reales del video
// es exactamente el tipo de trabajo que traba el hilo principal en low-end devices (compite con
// el propio <video> por el mismo hilo). Dejar que React agende el re-render normalmente cuesta
// como mucho un frame de latencia adicional -- imperceptible a las velocidades de giro de esta
// rueda -- a cambio de no bloquear el frame real del video. Combinado con
// VIDEO_GEOMETRY_FRAME_SKIP (saltear frames alternados), el trabajo de re-render se reduce a una
// fracción del que había antes.
//
// Busca el <video> activo vía getActiveWheelVideoElement (mismo patrón que useWheelRotationSync
// usa para '.lobby-wheel-rotor', pero re-consultado en cada swap): el doble-video de
// useSeamlessVideoLoop.ts cambia cuál elemento es el visible cada ~7s -- guardarse el elemento
// una sola vez al montar y no volver a consultarlo hace que este hook se quede escuchando
// requestVideoFrameCallback del que quedó pausado (que ya no dispara nada) y la geometría se
// congele justo en el primer swap. onWheelVideoSwap fuerza una re-suscripción al elemento
// correcto cada vez que eso pasa.
export function useWheelVideoPocketGeometry(video: WheelVideoGeometry): PocketGeometry {
  const [geometry, setGeometry] = useState<PocketGeometry>(() => resolveGeometry(video, 0))

  useLayoutEffect(() => {
    let cancelled = false
    let unsubscribeCurrent: (() => void) | null = null

    function subscribeToActiveVideo() {
      unsubscribeCurrent?.()
      unsubscribeCurrent = null

      const videoEl = getActiveWheelVideoElement()
      if (!videoEl) return

      let frameCounter = 0
      function shouldSkipFrame(): boolean {
        frameCounter = (frameCounter + 1) % VIDEO_GEOMETRY_FRAME_SKIP
        return frameCounter !== 0
      }

      if (typeof videoEl.requestVideoFrameCallback !== 'function') {
        // Fallback defensivo -- no se espera este caso en el navegador de este kiosco (Chrome/Edge),
        // ver mismo criterio en onVideoNearEnd (utils/videoSeek.ts).
        let handle: number
        function tick() {
          if (cancelled) return
          if (!shouldSkipFrame()) setGeometry(resolveGeometry(video, videoEl!.currentTime))
          handle = requestAnimationFrame(tick)
        }
        handle = requestAnimationFrame(tick)
        unsubscribeCurrent = () => cancelAnimationFrame(handle)
        return
      }

      let vfcHandle: number
      function tick(_now: DOMHighResTimeStamp, metadata: VideoFrameCallbackMetadata) {
        if (cancelled) return
        if (!shouldSkipFrame()) setGeometry(resolveGeometry(video, metadata.mediaTime))
        vfcHandle = videoEl!.requestVideoFrameCallback(tick)
      }
      vfcHandle = videoEl.requestVideoFrameCallback(tick)
      unsubscribeCurrent = () => videoEl.cancelVideoFrameCallback(vfcHandle)
    }

    subscribeToActiveVideo()
    const unsubscribeSwap = onWheelVideoSwap(subscribeToActiveVideo)

    return () => {
      cancelled = true
      unsubscribeCurrent?.()
      unsubscribeSwap()
    }
  }, [video])

  return geometry
}
