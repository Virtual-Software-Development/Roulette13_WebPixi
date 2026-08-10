import { useEffect,useState } from 'react'
import { Background } from '../layout/Background'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useResultsStore } from '../store/useResultsStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useTexture } from '../hooks/useTexture'
import { useViewport } from '../hooks/useViewport'
import { useScreenSize } from '../hooks/useScreenSize'
import i18n from '../i18n'

interface RouletteVideoViewProps {
  onVideoEnd?: () => void
}

export function RouletteVideoView({ onVideoEnd }: RouletteVideoViewProps) {
  return (
    <>
      <Background />
      <RouletteVideoSprite onVideoEnd={onVideoEnd} />
    </>
  )
}

interface RouletteVideoSpriteProps {
  onVideoEnd?: () => void
}

function RouletteVideoSprite({ onVideoEnd }: RouletteVideoSpriteProps) {
  const videoUrlFromStore = useGameConfigStore((state) => state.videoUrl)
  const { texture: videoTexture } = useTexture(videoUrlFromStore, { unloadOnChange: true })
  const { scale, offsetX, offsetY } = useViewport()
  const { width: screenWidth, height: screenHeight } = useScreenSize()
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (!videoTexture) return

    const video = videoTexture.source.resource as HTMLVideoElement
    video.muted = true
    video.loop = false
    video.play()

    setIsPlaying(true)

    function handlePause() {
      setIsPlaying(false)
    }

    function handleEnded() {
      setIsPlaying(false)

      const pendingResult = useDrawCycleStore.getState().pendingResult
      if (pendingResult) {
        useResultsStore.getState().addResult({
          id: pendingResult.drawNo,
          time: new Date().toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit', hour12: true }),
          drawNumber: pendingResult.drawNo,
          winningNumber: pendingResult.result,
        })
        useDrawCycleStore.getState().setPendingResult(null)
      } else {
        console.error('El video terminó sin un resultado real pendiente (drawResult no llegó a tiempo).')
      }

      onVideoEnd?.()
    }

    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [videoTexture, onVideoEnd])

  if (!videoTexture || !isPlaying) return null

  // El video debe estirarse exacto a la pantalla real (sin recortes, deformando si hace
  // falta), a diferencia del resto del layout que usa cover sobre el canvas de diseño.
  // Este valor cancela la transformación del padre (scale/offset de ResponsiveStage)
  // para pintar exactamente (0,0)-(screenWidth,screenHeight) en píxeles reales.
  return (
    <pixiSprite
      texture={videoTexture}
      x={-offsetX / scale}
      y={-offsetY / scale}
      width={screenWidth / scale}
      height={screenHeight / scale}
    />
  )
}
