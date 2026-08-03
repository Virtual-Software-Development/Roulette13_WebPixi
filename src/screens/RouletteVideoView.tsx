import { useEffect,useState } from 'react'
import { SharedLayout } from '../layout/SharedLayout'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useTexture } from '../hooks/useTexture'
import { useScreenSize } from '../hooks/useScreenSize'
import backgroundUrl from '../assets/background-test.jpg'
import logoUrl from '../assets/logo-central.png'
import drawImageUrl from '../assets/drawBox.png'
import videoUrl from '../assets/roulette-video.mp4'
import { LAYOUT } from '../layout/layout.constants'


export function RouletteVideoView() {
  const setGameConfig = useGameConfigStore((state) => state.setGameConfig)

  useEffect(() => {
    setGameConfig({
      gameName: 'Roulette 13',
      logoUrl,
      backgroundUrl,
      videoUrl,
      drawImageUrl,
      drawNumber: '1234',
      nextDrawTime: '10:30 PM',
      showTitle: true,
      showDateTime: true,
      showDrawInfo: true,
      showLogo: true
    })
  }, [setGameConfig])

  return (
    <SharedLayout>
      <RouletteVideoSprite />
    </SharedLayout>
  )
}

function RouletteVideoSprite() {
  const setGameConfig = useGameConfigStore((state) => state.setGameConfig)
  const videoUrlFromStore = useGameConfigStore((state) => state.videoUrl)
  const videoTexture = useTexture(videoUrlFromStore)
  const { width, height } = useScreenSize()
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (!videoTexture) return

    const video = videoTexture.source.resource as HTMLVideoElement
    video.muted = true
    video.loop = false
    video.play()

    setGameConfig({ showTitle: false, showDateTime: false, showDrawInfo: false, showLogo: false })
    setIsPlaying(true)

    function handlePauseOrEnd() {
      setGameConfig({ showTitle: true, showDateTime: true, showDrawInfo: true, showLogo: true })
      setIsPlaying(false)
    }

    video.addEventListener('pause', handlePauseOrEnd)
    video.addEventListener('ended', handlePauseOrEnd)

    return () => {
      video.removeEventListener('pause', handlePauseOrEnd)
      video.removeEventListener('ended', handlePauseOrEnd)
      setGameConfig({ showTitle: true, showDateTime: true, showDrawInfo: true, showLogo: true })
    }
  }, [videoTexture, setGameConfig])

  if (!videoTexture || !isPlaying) return null

  return (
    <pixiSprite texture={videoTexture} x={0} y={-LAYOUT.headerHeight} width={width} height={height} />
  )
}