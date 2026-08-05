import { useEffect,useState } from 'react'
import { SharedLayout } from '../layout/SharedLayout'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useResultsStore } from '../store/useResultsStore'
import { useTexture } from '../hooks/useTexture'
import { useScreenSize } from '../hooks/useScreenSize'
import i18n from '../i18n'
import backgroundUrl from '../assets/background-test.jpg'
import logoUrl from '../assets/logo-central.png'
import videoUrl from '../assets/roulette-video.mp4'
import { LAYOUT } from '../layout/layout.constants'

interface RouletteVideoViewProps {
  onVideoEnd?: () => void
}

export function RouletteVideoView({ onVideoEnd }: RouletteVideoViewProps) {
  const setGameConfig = useGameConfigStore((state) => state.setGameConfig)

  useEffect(() => {
    setGameConfig({
      gameName: 'Roulette 13',
      logoUrl,
      backgroundUrl,
      videoUrl,
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
      <RouletteVideoSprite onVideoEnd={onVideoEnd} />
    </SharedLayout>
  )
}

interface RouletteVideoSpriteProps {
  onVideoEnd?: () => void
}

function RouletteVideoSprite({ onVideoEnd }: RouletteVideoSpriteProps) {
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

    function restoreHeader() {
      setGameConfig({ showTitle: true, showDateTime: true, showDrawInfo: true, showLogo: true })
    }

    function handlePause() {
      restoreHeader()
      setIsPlaying(false)
    }

    function handleEnded() {
      restoreHeader()
      setIsPlaying(false)

      useResultsStore.getState().addResult({
        id: crypto.randomUUID(),
        time: new Date().toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit' }),
        drawNumber: String(Math.floor(Math.random() * 99999)).padStart(5, '0'),
        winningNumber: Math.floor(Math.random() * 13),
      })

      onVideoEnd?.()
    }

    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      restoreHeader()
    }
  }, [videoTexture, setGameConfig, onVideoEnd])

  if (!videoTexture || !isPlaying) return null

  return (
    <pixiSprite texture={videoTexture} x={0} y={-LAYOUT.headerHeight} width={width} height={height} />
  )
}