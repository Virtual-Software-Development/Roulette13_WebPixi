import { useCallback, useEffect, useState } from 'react'
import { Application } from '@pixi/react'
import { RouletteVideoView } from './screens/RouletteVideoView'
import { RouletteLobby } from './screens/RouletteLobby'
import { LobbyBackgroundLayer } from './screens/LobbyBackgroundLayer'
import { WinnerPanel } from './screens/WinnerPanel'
import { VideoErrorRound, type VideoErrorRoundInfo } from './screens/VideoErrorRound'
import { ResponsiveStage } from './layout/ResponsiveStage'
import { VideoPoolLayer } from './video/VideoPoolLayer'
import { DRAW_VIDEO_SLOT_ID, getVideoSlot, loadVideoSrc, resetVideoSlot } from './video/videoElements'
import { fetchVideoDurationMs } from './video/videoDuration'
import { fetchGameInfo } from './api/gameInfo'
import { applyGameInfo } from './api/applyGameInfo'
import { fetchDrawResult } from './api/drawResult'
import { fetchLastResults } from './api/lastResults'
import { fetchBetsSummary } from './api/betsSummary'
import { useGameConfigStore } from './store/useGameConfigStore'
import { useDrawCycleStore } from './store/useDrawCycleStore'
import { useResultsStore } from './store/useResultsStore'
import { useBetsSummaryStore } from './store/useBetsSummaryStore'
import { pickRandomDrawResultVideoUrl } from './utils/media'
import { parseApiDateTime } from './utils/time'
import { toLiveTableBetsData, toResultStatsData } from './utils/betsSummaryMapping'
import { WHEEL_VIDEO_FROZEN } from './config/wheelCalibration'
import { LiveTableBetsOverlay } from './components/liveTableBets/LiveTableBetsOverlay'
import { LIVE_TABLE_BETS_MOCK_DATA } from './data/liveTableBetsMockData'
import { ResultStatsOverlay } from './components/resultStats/ResultStatsOverlay'
import { RESULT_STATS_MOCK_DATA } from './data/resultStatsMockData'
import { LeftStatsSidebarOverlay } from './components/leftStatsSidebar/LeftStatsSidebarOverlay'
import { QuickMoneySplitOverlay } from './screens/QuickMoneySplitOverlay'
import { QuickMoneyVideoView } from './screens/QuickMoneyVideoView'
import { QuickMoneyLobbyCycle } from './hooks/useQuickMoneyLobbyCycle'
import { useLobbyModeStore } from './store/useLobbyModeStore'

const RESULT_LEAD_MS = 500
// Momento en que se pide /api/bets -- pedido explícito: "10 segundos para cargar el video". Mismo
// timer que ya agenda resultTimer/startTimer (scheduleDraw, basado en nextDraw.startTime), no uno
// nuevo independiente.
const BETS_LEAD_MS = 10_000
// Margen, contado desde la hora programada del sorteo, para que el video termine de cargar. Pasado
// esto (o antes, si la carga falla del todo) la ronda se muestra con VideoErrorRound en lugar del
// video. Corto a propósito: mientras se espera, esta máquina sigue en el lobby y las demás ya
// están mostrando el video.
const VIDEO_LOAD_GRACE_MS = 3000
// Solo si no hubo forma de consultar el video que se iba a mostrar (drawResult no llegó, o no se
// pudo leer su encabezado) -- duración típica de la librería (14.7s-20.9s, medido con ffprobe).
const UNKNOWN_VIDEO_DURATION_MS = 18_000

type DrawPreparation = { kind: 'video' } | { kind: 'error'; videoDurationMs: number }

// Rechaza si `promise` no resolvió para `deadlineMs` (timestamp absoluto) -- ningún paso de la
// preparación del video tiene timeout propio (ver el watchdog más abajo).
function withDeadline<T>(promise: Promise<T>, deadlineMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('El video no terminó de cargar a tiempo')),
      Math.max(0, deadlineMs - Date.now())
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

function App() {
  const [videoMounted, setVideoMounted] = useState(false)
  // No-null = la ronda en curso se muestra con VideoErrorRound porque el video no cargó.
  const [videoErrorRound, setVideoErrorRound] = useState<VideoErrorRoundInfo | null>(null)

  // Agenda el próximo sorteo: pide /gameInfo, y programa dos timers según
  // nextDraw.startTime — uno para pedir /drawResult 500ms antes (y precargar
  // el video), y otro para, justo a la hora del sorteo, activar la secuencia de
  // video (RouletteLobby se queda visible hasta ese momento, sin loader) — el
  // margen de 500ms no alcanza para bufferizar el video, así que se espera al
  // preload (videoReadyPromise) antes de activarla si todavía no terminó.
  const scheduleDraw = useCallback((isCancelled: () => boolean, seedHistory: boolean) => {
    let resultTimer: ReturnType<typeof setTimeout> | undefined
    let startTimer: ReturnType<typeof setTimeout> | undefined
    let betsTimer: ReturnType<typeof setTimeout> | undefined
    let videoReadyPromise: Promise<DrawPreparation> | null = null

    fetchGameInfo()
      .then((data) => {
        if (isCancelled()) return
        applyGameInfo(data, { seedHistory })

        const { drawNo, startTime } = data.nextDraw
        const drawStartMs = parseApiDateTime(startTime).getTime()
        const msUntilStart = Math.max(0, drawStartMs - Date.now())
        const msUntilResult = Math.max(0, msUntilStart - RESULT_LEAD_MS)
        const msUntilBets = Math.max(0, msUntilStart - BETS_LEAD_MS)

        // /api/bets alimenta LiveTableBetsPanel/LeftStatsSidebar/ResultStatsPanel -- independiente
        // de resultTimer/startTimer (no necesita el número ganador, solo el resumen de apuestas
        // vigente), así que es un timer propio en vez de encadenarse a los otros dos.
        betsTimer = setTimeout(() => {
          if (isCancelled()) return
          fetchBetsSummary()
            .then((data) => {
              if (isCancelled()) return
              useBetsSummaryStore.getState().setBetsSummary({
                liveTableBetsData: toLiveTableBetsData(data),
                resultStatsData: toResultStatsData(data),
              })
            })
            .catch((err) => console.error('No se pudo obtener /api/bets', err))
        }, msUntilBets)

        // Siempre resuelve (nunca rechaza) con cómo mostrar la ronda: con el video, si cargó a
        // tiempo, o con VideoErrorRound si no -- en ese caso con la duración del video que SE IBA a
        // mostrar, leída de su encabezado, para que el panel ocupe exactamente el mismo tiempo y
        // esta máquina vuelva al lobby junto con las demás. Reemplaza al viejo clip de reserva
        // fijo (mostraba un 12 aunque el resultado fuera otro, y el archivo ya no existía).
        resultTimer = setTimeout(() => {
          if (isCancelled()) return

          const draw: { result: number | null; videoDuration: Promise<number> | null } = {
            result: null,
            videoDuration: null,
          }

          const videoLoaded = fetchDrawResult(drawNo).then(async ({ result }) => {
            draw.result = result
            const videoUrl = await pickRandomDrawResultVideoUrl(result)
            // En paralelo con la carga (son pocos KB) -- si el <video> falla, la duración ya está.
            draw.videoDuration = fetchVideoDurationMs(videoUrl)
            draw.videoDuration.catch(() => {})
            await loadVideoSrc(getVideoSlot(DRAW_VIDEO_SLOT_ID), videoUrl)
            return videoUrl
          })

          videoReadyPromise = withDeadline(videoLoaded, drawStartMs + VIDEO_LOAD_GRACE_MS).then(
            (videoUrl): DrawPreparation => {
              if (!isCancelled() && draw.result !== null) {
                useDrawCycleStore.getState().setPendingResult({ drawNo, result: draw.result })
                useGameConfigStore.getState().setGameConfig({ videoUrl })
              }
              return { kind: 'video' }
            },
            async (err): Promise<DrawPreparation> => {
              console.error('El video del sorteo no cargó -- se muestra el panel de próxima ronda en su lugar', err)
              if (isCancelled()) return { kind: 'error', videoDurationMs: UNKNOWN_VIDEO_DURATION_MS }
              // Corta la descarga si quedó colgada a mitad de camino.
              resetVideoSlot(getVideoSlot(DRAW_VIDEO_SLOT_ID))
              // El resultado es real aunque el video no haya cargado -- se registra igual, en el
              // instante en que el video habría terminado (ver VideoErrorRound). Si drawResult
              // nunca llegó, no hay número que registrar.
              if (draw.result !== null) {
                useDrawCycleStore.getState().setPendingResult({ drawNo, result: draw.result })
              }
              const videoDurationMs = await (draw.videoDuration ?? Promise.reject(new Error('No se llegó a elegir un video')))
                .catch((durationErr: unknown) => {
                  console.error('No se pudo consultar la duración del video -- se usa la típica', durationErr)
                  return UNKNOWN_VIDEO_DURATION_MS
                })
              return { kind: 'error', videoDurationMs }
            }
          )
        }, msUntilResult)

        startTimer = setTimeout(() => {
          if (isCancelled()) return
          const startRound = (preparation: DrawPreparation) => {
            // WHEEL_VIDEO_FROZEN (ver LobbyBackgroundLayer.tsx): con la rueda calibrándose a mano
            // sobre un frame quieto (o moviéndose cuadro a cuadro con WheelFrameStepper.tsx), no
            // queremos que el reloj del próximo sorteo dispare la escena de juego a mitad de
            // sesión -- se pierde el frame que se estaba comparando.
            if (isCancelled() || WHEEL_VIDEO_FROZEN) return
            useDrawCycleStore.getState().setActive(true)
            useDrawCycleStore.getState().setLobbyInfoVisible(false)
            useDrawCycleStore.getState().setWinnerPanelNumber(null)
            useDrawCycleStore.getState().setWinnerPanelExiting(false)
            if (preparation.kind === 'error') {
              // Estimación inicial del countdown: roundInterval no siempre coincide con la
              // separación real entre sorteos (en dev se midió 56s contra un roundInterval de 60s),
              // así que se reemplaza por el nextDraw real de /gameInfo apenas llega -- el sorteo en
              // curso ya arrancó, así que el backend ya informa el siguiente. Solo se lee la hora,
              // sin applyGameInfo: el resto del lobby se actualiza como siempre en onEnded.
              const { roundIntervalMs } = useGameConfigStore.getState()
              setVideoErrorRound({
                drawStartMs,
                videoDurationMs: preparation.videoDurationMs,
                nextRoundStartIso: roundIntervalMs ? new Date(drawStartMs + roundIntervalMs).toISOString() : '',
              })
              fetchGameInfo()
                .then(({ nextDraw }) => {
                  if (isCancelled() || parseApiDateTime(nextDraw.startTime).getTime() <= drawStartMs) return
                  setVideoErrorRound((current) =>
                    current?.drawStartMs === drawStartMs ? { ...current, nextRoundStartIso: nextDraw.startTime } : current
                  )
                })
                .catch((err) => console.error('No se pudo obtener la hora de la próxima ronda', err))
            } else {
              setVideoMounted(true)
            }
          }
          if (videoReadyPromise) {
            videoReadyPromise.then(startRound)
          } else {
            startRound({ kind: 'video' })
          }
        }, msUntilStart)
      })
      .catch((err) => console.error('No se pudo agendar el próximo sorteo', err))

    return () => {
      clearTimeout(resultTimer)
      clearTimeout(startTimer)
      clearTimeout(betsTimer)
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
  // GameList/LastGame y queda acotado a maxResults). Se pide al montar Y cada vez que `active`
  // vuelve a false -- ni bien termina el hold, que es también el instante en que la rueda de
  // imagen retoma girando (LobbyBackgroundLayer: se destraba apenas videoSlideProgress deja de
  // estar en 1, lo que pasa ni bien active pasa a false). Se dispara ahí (no en lobbyInfoVisible,
  // que recién llega ~1.3s después: bajada de la rueda + salida del panel Winner) para darle todo
  // ese margen extra al fetch y a la recomputación de hot/cold, y que el panel de números
  // (que igual espera otro 1s más, ver SHOW_DELAY_AFTER_LOBBY_INFO_MS en useHotColdWindow) nunca
  // alcance a mostrarse todavía con el resultado de la ronda anterior.
  const active = useDrawCycleStore((state) => state.active)
  // Solo cambia unas pocas veces por ciclo de Quick Money (ver config/quickMoneyLobbyCycle.ts).
  const lobbyPhase = useLobbyModeStore((state) => state.phase)
  // Caen a los mocks solo hasta que llegue el primer /api/bets exitoso (ver BETS_LEAD_MS más
  // arriba) -- una vez que el store tiene datos reales, se quedan para siempre (nunca vuelve a
  // null).
  const liveTableBetsData = useBetsSummaryStore((state) => state.liveTableBetsData) ?? LIVE_TABLE_BETS_MOCK_DATA
  const resultStatsData = useBetsSummaryStore((state) => state.resultStatsData) ?? RESULT_STATS_MOCK_DATA
  useEffect(() => {
    if (active) return
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
  }, [active])

  // Apaga highlighted/showChipStack de LiveTableBetsPanel (pedido explícito: "cuando se oculte
  // apagas el highlight y apagas la moneda también") -- se dispara junto con `active=false`, el
  // mismo instante en que los tres paneles (LiveTableBetsPanel/ResultStatsPanel/LeftStatsSidebar)
  // empiezan a desvanecerse. No borra los totales, ver useBetsSummaryStore.clearHighlights.
  useEffect(() => {
    if (active) return
    useBetsSummaryStore.getState().clearHighlights()
  }, [active])

  // Watchdog -- ninguno de los fetches/promesas encadenados dentro de scheduleDraw (fetchDrawResult,
  // pickRandomDrawResultVideoUrl, loadVideoSrc esperando 'loadedmetadata') tiene timeout: si
  // cualquiera de ellos se cuelga (no falla, nunca resuelve ni rechaza -- red lenta/rota, video que
  // nunca dispara su evento), showVideo() nunca corre, RouletteVideoView nunca se monta, su onEnded
  // nunca dispara handleRoundEnded, y como ese es el único punto que vuelve a llamar scheduleDraw(),
  // nextDrawStartTime queda congelado y el countdown se clava en 00:00 para siempre (ver
  // conversación). Esta red de seguridad no ataca esos cuelgues uno por uno -- solo detecta "pasó
  // un margen generoso desde nextDrawStartTime y la ronda sigue sin arrancar" y fuerza un
  // scheduleDraw() nuevo (mismo mecanismo que handleRoundEnded), que reagenda todo desde /gameInfo.
  useEffect(() => {
    const STUCK_GRACE_MS = 20_000
    const CHECK_INTERVAL_MS = 5_000
    const interval = setInterval(() => {
      if (active || videoMounted || videoErrorRound) return
      const nextDrawStartTime = useGameConfigStore.getState().nextDrawStartTime
      if (!nextDrawStartTime) return
      const msPastStart = Date.now() - parseApiDateTime(nextDrawStartTime).getTime()
      if (msPastStart > STUCK_GRACE_MS) {
        console.warn('El sorteo no arrancó a tiempo, reagendando...', { nextDrawStartTime })
        scheduleDraw(() => false, false)
      }
    }, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [active, videoMounted, videoErrorRound, scheduleDraw])

  // Se llama apenas el video termina de reproducirse (bien antes del
  // freeze-hold/slide-down) — agenda el próximo sorteo ahí, no cuando vuelve
  // a mostrarse el lobby, para que Header/LastGame ya tengan los datos
  // actualizados (nextDraw/drawNumber) para cuando termine de regresar la
  // animación en vez de mostrar el dato viejo un instante y luego saltar.
  const handleRoundEnded = useCallback(() => {
    scheduleDraw(() => false, false)
  }, [scheduleDraw])

  // Fin de una ronda mostrada con VideoErrorRound -- el panel ya salió y el lobby volvió.
  const handleVideoErrorRoundFinished = useCallback(() => {
    setVideoErrorRound(null)
  }, [])

  // Se llama recién cuando el video ya terminó de bajar de vuelta a su lugar
  // de partida (después del hold sobre el resultado) — recién ahí es seguro
  // desmontarlo.
  const handleFullyExited = useCallback(() => {
    setVideoMounted(false)
    useDrawCycleStore.getState().setWinnerPanelExiting(true)
  }, [])

  return (
    <>
      <LobbyBackgroundLayer />
      <VideoPoolLayer />
      <WinnerPanel />
      {videoErrorRound && (
        <VideoErrorRound
          round={videoErrorRound}
          onEnded={handleRoundEnded}
          onFinished={handleVideoErrorRoundFinished}
        />
      )}
      <QuickMoneyLobbyCycle />
      <QuickMoneySplitOverlay />
      {lobbyPhase === 'quickMoneyVideo' && <QuickMoneyVideoView />}
      <Application
        // antialias: sin él los bordes de Graphics (anillos de Last 100 Spins, etc.) salían dentados
        // ("granulados") -- pedido explícito.
        antialias={true}
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
      <LiveTableBetsOverlay data={liveTableBetsData} />
      <ResultStatsOverlay data={resultStatsData} />
      <LeftStatsSidebarOverlay data={liveTableBetsData} />
    </>
  )
}

export default App
