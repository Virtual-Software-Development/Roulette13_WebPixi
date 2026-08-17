import { useEffect,useMemo } from 'react'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useResultsStore } from '../store/useResultsStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useTexture } from '../hooks/useTexture'
import { useViewport } from '../hooks/useViewport'
import { useScreenSize } from '../hooks/useScreenSize'
import { useAnimatedProgress } from '../hooks/useAnimatedProgress'
import { LumaKeyFilter } from '../pixi/filters/LumaKeyFilter'
import { RESULT_HOLD_MS, TRANSITION_DURATION_MS } from '../layout/layout.constants'
import { easeInOutCubic } from '../utils/easing'
import i18n from '../i18n'

interface RouletteVideoViewProps {
  // Se llama recién cuando el video termina de bajar de vuelta a su posición
  // de partida (no cuando termina de reproducirse — eso solo arranca el hold).
  onFullyExited?: () => void
}

export function RouletteVideoView({ onFullyExited }: RouletteVideoViewProps) {
  return <RouletteVideoSprite onFullyExited={onFullyExited} />
}

interface RouletteVideoSpriteProps {
  onFullyExited?: () => void
}

function RouletteVideoSprite({ onFullyExited }: RouletteVideoSpriteProps) {
  const videoUrlFromStore = useGameConfigStore((state) => state.videoUrl)
  const { texture: videoTexture } = useTexture(videoUrlFromStore, { unloadOnChange: true })
  const { scale, offsetX, offsetY } = useViewport()
  const { width: screenWidth, height: screenHeight } = useScreenSize()
  const active = useDrawCycleStore((state) => state.active)
  // Vuelve transparente el fondo negro quemado en los videos locales para que se vea
  // el Background de ResultsView (siempre montado detrás) en su lugar.
  const lumaKeyFilter = useMemo(() => new LumaKeyFilter(), [])

  // progress 0 = oculto abajo de la pantalla, 1 = en su posición final mostrándose.
  // Sube cuando active pasa a true, y baja cuando vuelve a false — el mismo cálculo
  // sirve para la entrada y, en reversa, para la salida.
  const progress = useAnimatedProgress(active ? 1 : 0, TRANSITION_DURATION_MS)
  const eased = easeInOutCubic(progress)
  const arrived = active && progress === 1
  const fullyExited = !active && progress === 0

  useEffect(() => {
    if (!videoTexture) return

    const video = videoTexture.source.resource as HTMLVideoElement
    video.muted = true
    video.loop = false

    let holdTimer: ReturnType<typeof setTimeout> | undefined

    function handleEnded() {
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

      // Deja el último frame congelado un rato (el resultado visible) antes de
      // disparar la bajada del video y el regreso de ResultsView.
      holdTimer = setTimeout(() => {
        useDrawCycleStore.getState().setActive(false)
      }, RESULT_HOLD_MS)
    }

    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('ended', handleEnded)
      clearTimeout(holdTimer)
    }
  }, [videoTexture])

  // Recién arranca a reproducirse una vez que termina de subir a su posición final.
  useEffect(() => {
    if (!videoTexture || !arrived) return

    const video = videoTexture.source.resource as HTMLVideoElement
    video.play()
  }, [videoTexture, arrived])

  // Avisa recién cuando terminó de bajar de vuelta, para que App desmonte este
  // componente y programe el siguiente sorteo.
  useEffect(() => {
    if (fullyExited) onFullyExited?.()
  }, [fullyExited, onFullyExited])

  if (!videoTexture) return null

  // El video debe estirarse exacto a la pantalla real (sin recortes, deformando si hace
  // falta), a diferencia del resto del layout que usa cover sobre el canvas de diseño.
  // Este valor cancela la transformación del padre (scale/offset de ResponsiveStage)
  // para pintar exactamente (0,0)-(screenWidth,screenHeight) en píxeles reales.
  const finalY = -offsetY / scale
  const y = finalY + (1 - eased) * (screenHeight / scale)

  return (
    <pixiSprite
      texture={videoTexture}
      x={-offsetX / scale}
      y={y}
      width={screenWidth / scale}
      height={screenHeight / scale}
      filters={[lumaKeyFilter]}
    />
  )
}
