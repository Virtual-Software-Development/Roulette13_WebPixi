import { useCallback, useEffect, useState } from 'react'
import { Assets } from 'pixi.js'
import { Application } from '@pixi/react'
import { RouletteVideoView } from './screens/RouletteVideoView'
import { ResultsView } from './screens/ResultsView'
import { LoadingView } from './screens/LoadingView'
import { ResponsiveStage } from './layout/ResponsiveStage'
import { fetchGameInfo } from './api/gameInfo'
import { applyGameInfo } from './api/applyGameInfo'
import { fetchDrawResult } from './api/drawResult'
import { useGameConfigStore } from './store/useGameConfigStore'
import { useDrawCycleStore } from './store/useDrawCycleStore'
import { buildDrawResultVideoUrl } from './utils/media'
import { parseApiDateTime } from './utils/time'

const RESULT_LEAD_MS = 500

function App() {
  const [screen, setScreen] = useState<'video' | 'loading' | 'results'>('results')

  // Agenda el próximo sorteo: pide /gameInfo, y programa dos timers según
  // nextDraw.startTime — uno para pedir /drawResult 500ms antes (y precargar
  // el video), y otro para, justo a la hora del sorteo, mostrar el loader y
  // recién pasar a la vista de video cuando el preload (videoReadyPromise)
  // termine — el margen de 500ms no alcanza para bufferizar el video, así que
  // el loader cubre esa espera en vez de dejar la pantalla congelada.
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
            .then(({ result, video }) => {
              if (isCancelled()) return
              const videoUrl = buildDrawResultVideoUrl(result, video)
              useDrawCycleStore.getState().setPendingResult({ drawNo, result, video })
              useGameConfigStore.getState().setGameConfig({ videoUrl })
              return Assets.load(videoUrl)
            })
            .then(
              () => {},
              (err) => console.error('No se pudo precargar el video del sorteo', err)
            )
        }, msUntilResult)

        startTimer = setTimeout(() => {
          if (isCancelled()) return
          setScreen('loading')
          const showVideo = () => {
            if (!isCancelled()) setScreen('video')
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

  const handleVideoEnd = useCallback(() => {
    setScreen('results')
    scheduleDraw(() => false, false)
  }, [scheduleDraw])

  return (
    <>
      <Application
        autoDensity={true}
        resizeTo={window}
        resolution={window.devicePixelRatio || 1}
        background={0x000000}
      >
        <ResponsiveStage>
          {screen === 'video' && <RouletteVideoView onVideoEnd={handleVideoEnd} />}
          {screen === 'loading' && <LoadingView />}
          {screen === 'results' && <ResultsView />}
        </ResponsiveStage>
      </Application>
    </>
  )
}

export default App
