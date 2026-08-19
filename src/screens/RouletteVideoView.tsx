import { useEffect } from 'react'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useResultsStore } from '../store/useResultsStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useTexture } from '../hooks/useTexture'
import { useViewport } from '../hooks/useViewport'
import { useScreenSize } from '../hooks/useScreenSize'
import { useAnimatedProgress } from '../hooks/useAnimatedProgress'
import { ChromaKeyFilter } from '../pixi/filters/ChromaKeyFilter'
import { RESULT_HOLD_MS, TRANSITION_DURATION_MS } from '../layout/layout.constants'
import { easeInOutCubic } from '../utils/easing'
import i18n from '../i18n'

// Vuelve transparente el fondo azul sólido (#0000CF) de los videos locales para que se vea
// el Background de ResultsView (siempre montado detrás) en su lugar. Instancia única a nivel
// de módulo — RouletteVideoView se desmonta y remonta por completo en cada sorteo, así que
// crearla acá (en vez de con useMemo dentro del componente) evita recompilar el shader en cada sorteo.
//
// Nota: existe también AlphaMatteFilter (src/pixi/filters/AlphaMatteFilter.ts) para videos
// re-exportados con una máscara de alpha "cocinada" lado a lado en el mismo frame — no se usa
// acá porque los .webm ya traen alpha real embebida (ver hasNativeAlpha más abajo).
const ROULETTE_CHROMA_KEY_FILTER = new ChromaKeyFilter()

// Los videos exportados por el pipeline de Unity (RuntimeVideoRecorder → VP9 con alpha real,
// yuva420p) se entregan en .webm y ya traen su propia transparencia correcta — Chrome/Edge
// preservan ese canal al subir el frame como textura de WebGL, así que no hay que aplicarles
// ningún filtro (aplicar ChromaKeyFilter de todas formas podría "agujerear" por error una zona
// azulada del sujeto que en realidad debía quedar opaca). Los videos viejos (.mp4/.mov) siguen
// teniendo fondo azul sólido quemado y sí necesitan el chroma-key.
function hasNativeAlpha(url: string): boolean {
  return url.toLowerCase().endsWith('.webm')
}

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
      filters={hasNativeAlpha(videoUrlFromStore) ? undefined : [ROULETTE_CHROMA_KEY_FILTER]}
    />
  )
}
