import { useCallback, useEffect, useState } from 'react'
import { Application } from '@pixi/react'
import { RouletteVideoView } from './screens/RouletteVideoView'
import { RouletteLobby } from './screens/RouletteLobby'
import { LobbyBackgroundLayer } from './screens/LobbyBackgroundLayer'
import { ResponsiveStage } from './layout/ResponsiveStage'
import { VideoPoolLayer } from './video/VideoPoolLayer'
import { DRAW_VIDEO_SLOT_ID, getVideoSlot, loadVideoSrc } from './video/videoElements'
import { fetchGameInfo } from './api/gameInfo'
import { applyGameInfo } from './api/applyGameInfo'
import { fetchDrawResult } from './api/drawResult'
import { fetchLastResults } from './api/lastResults'
import { useGameConfigStore } from './store/useGameConfigStore'
import { useDrawCycleStore } from './store/useDrawCycleStore'
import { useResultsStore } from './store/useResultsStore'
import { pickRandomDrawResultVideoUrl } from './utils/media'
import { parseApiDateTime } from './utils/time'
import { WHEEL_VIDEO_FROZEN } from './config/wheelCalibration'

const RESULT_LEAD_MS = 500

function App() {
  const [videoMounted, setVideoMounted] = useState(false)

  // Agenda el próximo sorteo: pide /gameInfo, y programa dos timers según
  // nextDraw.startTime — uno para pedir /drawResult 500ms antes (y precargar
  // el video), y otro para, justo a la hora del sorteo, activar la secuencia de
  // video (RouletteLobby se queda visible hasta ese momento, sin loader) — el
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
                return loadVideoSrc(getVideoSlot(DRAW_VIDEO_SLOT_ID), videoUrl)
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
            // WHEEL_VIDEO_FROZEN (ver LobbyBackgroundLayer.tsx): con la rueda calibrándose a mano
            // sobre un frame quieto (o moviéndose cuadro a cuadro con WheelFrameStepper.tsx), no
            // queremos que el reloj del próximo sorteo dispare la escena de juego a mitad de
            // sesión -- se pierde el frame que se estaba comparando.
            if (isCancelled() || WHEEL_VIDEO_FROZEN) return
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

  // Historial largo (hasta ~100 resultados) para cálculos de frecuencia (hot/cold, ver
  // DEMO_NUMBERS_BY_TYPE en LobbyBackgroundLayer.tsx) -- separado de `history` (que alimenta
  // GameList/LastGame y queda acotado a maxResults). Se pide una sola vez al montar; no forma
  // parte del ciclo de sorteo (scheduleDraw), así que no hace falta reprogramarlo.
  useEffect(() => {
    let cancelled = false
    fetchLastResults()
      .then((data) => {
        if (cancelled) return
        useResultsStore.getState().setRawResults(data.results)
      })
      .catch((err) => console.error('No se pudo obtener /api/results', err))
    return () => {
      cancelled = true
    }
  }, [])

  // Se llama apenas el video termina de reproducirse (bien antes del
  // freeze-hold/slide-down) — agenda el próximo sorteo ahí, no cuando vuelve
  // a mostrarse el lobby, para que Header/LastGame ya tengan los datos
  // actualizados (nextDraw/drawNumber) para cuando termine de regresar la
  // animación en vez de mostrar el dato viejo un instante y luego saltar.
  const handleRoundEnded = useCallback(() => {
    scheduleDraw(() => false, false)
  }, [scheduleDraw])

  // Se llama recién cuando el video ya terminó de bajar de vuelta a su lugar
  // de partida (después del hold sobre el resultado) — recién ahí es seguro
  // desmontarlo.
  const handleFullyExited = useCallback(() => {
    setVideoMounted(false)
  }, [])

  return (
    <>
      <LobbyBackgroundLayer />
      <VideoPoolLayer />
      <Application
        autoDensity={true}
        resizeTo={window}
        resolution={Math.min(window.devicePixelRatio || 1, 1)}
        powerPreference="high-performance"
        backgroundAlpha={0}
      >
        <ResponsiveStage>
          <RouletteLobby />
          {videoMounted && <RouletteVideoView onEnded={handleRoundEnded} onFullyExited={handleFullyExited} />}
        </ResponsiveStage>
      </Application>
    </>
  )
}

export default App
