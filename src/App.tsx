import { useCallback, useEffect, useState } from 'react'
import { Assets, Texture } from 'pixi.js'
import { Application } from '@pixi/react'
import { RouletteVideoView } from './screens/RouletteVideoView'
import { ResultsView } from './screens/ResultsView'
import { ResponsiveStage } from './layout/ResponsiveStage'
import { fetchGameInfo } from './api/gameInfo'
import { applyGameInfo } from './api/applyGameInfo'
import { fetchDrawResult } from './api/drawResult'
import { useGameConfigStore } from './store/useGameConfigStore'
import { useDrawCycleStore } from './store/useDrawCycleStore'
import { pickRandomDrawResultVideoUrl } from './utils/media'
import { parseApiDateTime } from './utils/time'

const RESULT_LEAD_MS = 500

function App() {
  const [videoMounted, setVideoMounted] = useState(false)

  // Agenda el próximo sorteo: pide /gameInfo, y programa dos timers según
  // nextDraw.startTime — uno para pedir /drawResult 500ms antes (y precargar
  // el video), y otro para, justo a la hora del sorteo, activar la secuencia de
  // video (ResultsView se queda visible hasta ese momento, sin loader) — el
  // margen de 500ms no alcanza para bufferizar el video, así que se espera al
  // preload (videoReadyPromise) antes de activarla si todavía no terminó.
  const scheduleDraw = useCallback((isCancelled: () => boolean, seedHistory: boolean) => {
    let resultTimer: ReturnType<typeof setTimeout> | undefined
    let startTimer: ReturnType<typeof setTimeout> | undefined
    let videoReadyPromise: Promise<void> | null = null

    fetchGameInfo()
      .then((data) => {
        if (isCancelled()) return
        applyGameInfo(data, { seedHistory })

        const { drawNo, startTime } = data.nextDraw
        const msUntilStart = Math.max(0, parseApiDateTime(startTime).getTime() - Date.now())
        const msUntilResult = Math.max(0, msUntilStart - RESULT_LEAD_MS)

        resultTimer = setTimeout(() => {
          if (isCancelled()) return
          videoReadyPromise = fetchDrawResult(drawNo)
            .then(({ result }) => {
              if (isCancelled()) return
              return pickRandomDrawResultVideoUrl(result).then((videoUrl) => {
                if (isCancelled()) return
                useDrawCycleStore.getState().setPendingResult({ drawNo, result })
                useGameConfigStore.getState().setGameConfig({ videoUrl })
                return Assets.load<Texture>({ src: videoUrl, data: { autoPlay: false } })
              })
            })
            .then(
              () => {},
              (err) => console.error('No se pudo precargar el video del sorteo', err)
            )
        }, msUntilResult)

        startTimer = setTimeout(() => {
          if (isCancelled()) return
          const showVideo = () => {
            if (isCancelled()) return
            useDrawCycleStore.getState().setActive(true)
            setVideoMounted(true)
          }
          if (videoReadyPromise) {
            videoReadyPromise.then(showVideo)
          } else {
            showVideo()
          }
        }, msUntilStart)
      })
      .catch((err) => console.error('No se pudo agendar el próximo sorteo', err))

    return () => {
      clearTimeout(resultTimer)
      clearTimeout(startTimer)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const cleanup = scheduleDraw(() => cancelled, true)
    return () => {
      cancelled = true
      cleanup()
    }
  }, [scheduleDraw])

  // Se llama recién cuando el video ya terminó de bajar de vuelta a su lugar de
  // partida (después del hold sobre el resultado) — recién ahí es seguro
  // desmontarlo y programar el siguiente sorteo.
  const handleFullyExited = useCallback(() => {
    setVideoMounted(false)
    scheduleDraw(() => false, false)
  }, [scheduleDraw])

  return (
    <>
      <Application
        autoDensity={true}
        resizeTo={window}
        resolution={Math.min(window.devicePixelRatio || 1, 1)}
        powerPreference="high-performance"
        background={0x000000}
      >
        <ResponsiveStage>
          <ResultsView />
          {videoMounted && <RouletteVideoView onFullyExited={handleFullyExited} />}
        </ResponsiveStage>
      </Application>
    </>
  )
}

export default App
