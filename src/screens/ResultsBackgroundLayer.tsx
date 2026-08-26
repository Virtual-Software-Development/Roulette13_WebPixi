import { useEffect, useRef } from 'react'
import { buildMediaUrl } from '../utils/media'
import { loadVideoSrc } from '../video/videoElements'
import { useGameConfigStore } from '../store/useGameConfigStore'
import './resultsBackgroundLayer.css'

const LOBBY_LOOP_VIDEO_URL = buildMediaUrl('Lobby/lobby_loop.webm')

function playWithMutedFallback(video: HTMLVideoElement) {
  video.play().catch(() => {
    video.muted = true
    void video.play()
  })
}

// Fondo de ResultsView: un <video> real del DOM, sin pasar por Pixi/WebGL, montado como hermano
// de <Application> en App.tsx -- vive SIEMPRE detrás del canvas (z-index negativo, ver CSS).
// Reemplaza tanto al loop que antes pintaba LobbyView vía pixiSprite/textura como al <Background/>
// que pinta SharedLayout (ver prop hideBackground) -- todo el fondo de la pantalla de resultados
// pasa a ser nativo del navegador, en vez de Pixi. Sin overlay oscuro: el video va a brillo
// completo (a diferencia de la foto de Background, que sí lo lleva para contraste de texto).
export function ResultsBackgroundLayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const backgroundUrl = useGameConfigStore((state) => state.backgroundUrl)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let cancelled = false
    video.muted = true
    video.loop = true

    loadVideoSrc(video, LOBBY_LOOP_VIDEO_URL).then(() => {
      if (!cancelled) playWithMutedFallback(video)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="results-background-layer">
      {/* Detrás del video en el DOM (sin z-index propio, alcanza con el orden) -- el video de
          hoy es opaco (lobby_loop.webm no trae canal alfa), así que esta imagen todavía no se
          termina de ver hasta que se resuelva la transparencia del video. */}
      {backgroundUrl && <img src={backgroundUrl} className="results-background-image" alt="" />}
      <video ref={videoRef} className="results-background-video" playsInline preload="auto" />
    </div>
  )
}
