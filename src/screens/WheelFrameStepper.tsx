import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ACTIVE_WHEEL_TYPE } from '../data/wheelOrder'
import { WHEEL_VIDEO_GEOMETRY } from '../layout/wheelVideoGeometry.constants'
import { WHEEL_FRAME_STEPPER_ENABLED } from '../config/wheelCalibration'
import './wheelFrameStepper.css'

// Centrar el currentTime buscado a mitad del intervalo del frame (en vez de justo en el borde
// f/fps) para que el seek no caiga por redondeo en el frame anterior.
const FRAME_SEEK_BIAS = 0.5

// Panel de debug: mueve el <video> de la rueda (.lobby-wheel-video, ver LobbyBackgroundLayer.tsx)
// cuadro a cuadro en vez de dejarlo correr -- para calibrar WHEEL_VIDEO_GEOMETRY/WHEEL_GEOMETRY
// comparando pocket por pocket contra un frame exacto. Solo se monta si
// WHEEL_FRAME_STEPPER_ENABLED (?debug=full o ?debug=stepping en la URL, ver
// config/wheelCalibration.ts), que a su vez implica WHEEL_VIDEO_FROZEN (el video arranca pausado
// -- ver LobbyBackgroundLayer.tsx). No hace falta recalcular geometría/rotación a mano acá: mover
// video.currentTime dispara requestVideoFrameCallback igual que reproducir el video, así que
// useWheelVideoRigidRotationSync.ts / useWheelVideoPocketGeometry.ts (que ya escuchan eso) se
// actualizan solos cuando se cambia de cuadro.
export function WheelFrameStepper() {
  const videoGeometry = WHEEL_VIDEO_GEOMETRY[ACTIVE_WHEEL_TYPE]
  const [frameIndex, setFrameIndex] = useState(0)

  const getVideo = useCallback(
    () => document.querySelector<HTMLVideoElement>('.lobby-wheel-video[data-wheel-video-active="true"]'),
    [],
  )

  // No mantiene su propio estado de "cuál es el frame actual" más allá de lo necesario para
  // mostrarlo en pantalla -- lo lee de video.currentTime (fuente real) cada vez que el video
  // termina de moverse, así que si currentTime cambia por otro motivo (hot reload, dev tools) el
  // panel no queda desincronizado.
  useEffect(() => {
    if (!WHEEL_FRAME_STEPPER_ENABLED || !videoGeometry) return
    const video = getVideo()
    if (!video) return

    // Math.floor, no Math.round: seekToFrame() centra currentTime en frame+FRAME_SEEK_BIAS
    // (0.5) a propósito, así que round() cae justo en el punto de empate (ej. frame 4 -> 4.5 ->
    // round(4.5) da 5, no 4) y el label muestra un frame de más. floor() es la inversa correcta
    // de esa codificación.
    const sync = () => setFrameIndex(Math.floor(video.currentTime * videoGeometry.fps))
    video.addEventListener('seeked', sync)
    video.addEventListener('loadedmetadata', sync)
    sync()

    return () => {
      video.removeEventListener('seeked', sync)
      video.removeEventListener('loadedmetadata', sync)
    }
  }, [getVideo, videoGeometry])

  if (!WHEEL_FRAME_STEPPER_ENABLED || !videoGeometry) return null

  const frameCount = videoGeometry.pocketAngleDegByFrame.length

  function seekToFrame(index: number) {
    const video = getVideo()
    if (!video || !videoGeometry) return
    const clamped = Math.min(Math.max(index, 0), frameCount - 1)
    video.pause()
    video.currentTime = (clamped + FRAME_SEEK_BIAS) / videoGeometry.fps
    setFrameIndex(clamped)
  }

  // Portal a document.body a propósito: LobbyBackgroundLayer.tsx (donde se monta este componente)
  // vive dentro de .lobby-background-layer, que tiene z-index:-1 (queda detrás del <canvas> de
  // Pixi a propósito, ver lobbyBackgroundLayer.css) -- eso crea un stacking context propio, así
  // que CUALQUIER z-index puesto en un descendiente (aunque sea position:fixed) queda atrapado
  // adentro y sigue quedando detrás del canvas para efectos de click, aunque se vea encima. Sin
  // el portal los botones se ven pero los clicks los agarra el canvas de Pixi, no el botón.
  return createPortal(
    <div className="wheel-frame-stepper">
      <button type="button" className="wheel-frame-stepper-button" onClick={() => seekToFrame(frameIndex - 1)} disabled={frameIndex <= 0}>
        ◀ frame
      </button>
      <span className="wheel-frame-stepper-label">
        frame {frameIndex} / {frameCount - 1}
      </span>
      <button
        type="button"
        className="wheel-frame-stepper-button"
        onClick={() => seekToFrame(frameIndex + 1)}
        disabled={frameIndex >= frameCount - 1}
      >
        frame ▶
      </button>
    </div>,
    document.body,
  )
}
