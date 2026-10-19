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
import { fetchGameInfo } from './api/gameInfo'
import { applyGameInfo } from './api/applyGameInfo'
import { fetchDrawResult } from './api/drawResult'
import { fetchLastResults } from './api/lastResults'
import { fetchBetsSummary, fetchBetsSummaryOnce } from './api/betsSummary'
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
import { RoundHistoryModal } from './components/roundHistory/RoundHistoryModal'
import { QuickMoneySplitOverlay } from './screens/QuickMoneySplitOverlay'
import { QuickMoneyVideoView } from './screens/QuickMoneyVideoView'
import { QuickMoneyLobbyCycle } from './hooks/useQuickMoneyLobbyCycle'
import { useLobbyModeStore } from './store/useLobbyModeStore'
import { useLobbySyncStore } from './store/useLobbySyncStore'
import { applyRoughServerTime, serverNow, startServerClockResync, syncServerClock } from './time/serverClock'
import { joinDrawInProgress } from './sync/joinDrawInProgress'
import { seedQuickMoneyDraws } from './sync/quickMoneyHistory'
import { SyncOverlay } from './screens/SyncOverlay'
import type { GameInfoResponse } from './types/gameInfo'

// Cuánto antes de la hora del sorteo se pide /drawResult y se precarga el clip. El backend ejecuta el
// sorteo ~2s antes (resultRevealLead), así que el resultado ya existe -- con más margen de precarga,
// menos máquinas arrancan el video tarde respecto de las demás.
const RESULT_LEAD_MS = 1800
// Momento en que se pide /api/bets -- pedido explícito: "10 segundos para cargar el video". Mismo
// timer que ya agenda resultTimer/startTimer (scheduleDraw, basado en nextDraw.startTime), no uno
// nuevo independiente.
const BETS_LEAD_MS = 10_000
// Además, mientras la ronda está abierta el lobby vuelve a pedir /api/bets cada pocos segundos, para
// que el panel LIVE BETS muestre las apuestas a medida que entran (el backend ya devuelve los totales
// en vivo de la ronda pendiente, calculados de los tickets).
const BETS_POLL_MS = 3000
// Margen, contado desde la hora programada del sorteo, para que el video termine de cargar. Pasado
// esto (o antes, si la carga falla del todo) la ronda se muestra con VideoErrorRound en lugar del
// video. Corto a propósito: mientras se espera, esta máquina sigue en el lobby y las demás ya
// están mostrando el video.
const VIDEO_LOAD_GRACE_MS = 3000
// Tope de espera de las apuestas del lobby al arrancar, antes de sacar "Sincronizando…" igual.
const BOOT_BETS_TIMEOUT_MS = 4000

type DrawPreparation = { kind: 'video' } | { kind: 'error'; result: number | null }

// Rechaza si `promise` no resolvió para `deadlineMs` (timestamp absoluto) -- ningún paso de la
// preparación del video tiene timeout propio (ver el watchdog más abajo).
function withDeadline<T>(promise: Promise<T>, deadlineMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('El video no terminó de cargar a tiempo')),
      Math.max(0, deadlineMs - serverNow())
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
  // onGameInfo: solo en el arranque (ver el efecto de más abajo), con el /gameInfo ya aplicado y antes
  // de agendar nada.
  const scheduleDraw = useCallback((isCancelled: () => boolean, seedHistory: boolean, onGameInfo?: (data: GameInfoResponse) => void) => {
    let resultTimer: ReturnType<typeof setTimeout> | undefined
    let startTimer: ReturnType<typeof setTimeout> | undefined
    let betsTimer: ReturnType<typeof setTimeout> | undefined
    let videoReadyPromise: Promise<DrawPreparation> | null = null

    fetchGameInfo()
      .then((data) => {
        if (isCancelled()) return
        applyGameInfo(data, { seedHistory })
        onGameInfo?.(data)

        const { drawNo, startTime } = data.nextDraw
        const drawStartMs = parseApiDateTime(startTime).getTime()
        const msUntilStart = Math.max(0, drawStartMs - serverNow())
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
        // tiempo, o con VideoErrorRound si no -- que ocupa la misma ventana fija que el video
        // (sync/lobbyTimeline.ts), así esta máquina vuelve al lobby junto con las demás. Reemplaza
        // al viejo clip de reserva fijo (mostraba un 12 aunque el resultado fuera otro, y el
        // archivo ya no existía).
        resultTimer = setTimeout(() => {
          if (isCancelled()) return

          const draw: { result: number | null } = { result: null }

          const videoLoaded = fetchDrawResult(drawNo).then(async ({ result }) => {
            draw.result = result
            const videoUrl = await pickRandomDrawResultVideoUrl(result)
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
            (err): DrawPreparation => {
              console.error('El video del sorteo no cargó -- se muestra el panel de próxima ronda en su lugar', err)
              if (isCancelled()) return { kind: 'error', result: null }
              // Corta la descarga si quedó colgada a mitad de camino.
              resetVideoSlot(getVideoSlot(DRAW_VIDEO_SLOT_ID))
              // El resultado es real aunque el video no haya cargado -- se registra igual, en el
              // instante en que el video habría terminado (ver VideoErrorRound). Si drawResult
              // nunca llegó, no hay número que registrar.
              if (draw.result !== null) {
                useDrawCycleStore.getState().setPendingResult({ drawNo, result: draw.result })
              }
              return { kind: 'error', result: draw.result }
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
            useDrawCycleStore.getState().setDrawStartMs(drawStartMs)
            useDrawCycleStore.getState().setActive(true)
            useDrawCycleStore.getState().setLobbyInfoVisible(false)
            useDrawCycleStore.getState().setWinnerPanelNumber(null)
            useDrawCycleStore.getState().setWinnerPanelExiting(false)
            if (preparation.kind === 'error') {
              setVideoErrorRound({ drawStartMs, result: preparation.result })
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

  // Arranque: primero el reloj del servidor (todo lo que sigue se agenda contra él), después el
  // primer /gameInfo. Con él: si en las demás máquinas hay un sorteo en pantalla, esta se suma con
  // "Sincronizando…" (joinDrawInProgress), y se cargan las mismas apuestas que muestran las demás.
  useEffect(() => {
    let cancelled = false
    let cleanupDraw = () => {}
    let cleanupJoin = () => {}
    // Los stores sobreviven a un remontaje del lobby (MqttGate lo desmonta al perder MQTT/internet y
    // lo vuelve a montar al reconectar), pero los timers que los iban a mover se destruyen con los
    // componentes: si la caída fue a mitad de un sorteo, `active` quedaba en true para siempre
    // (rueda arriba, info del lobby y bolita del último ganador ocultas). Se arranca SIEMPRE desde
    // el lobby limpio y joinDrawInProgress / el ciclo de Quick Money vuelven a ubicar la fase real.
    useDrawCycleStore.setState({
      pendingResult: null,
      active: false,
      videoArrived: false,
      videoSlideProgress: 0,
      winnerPanelNumber: null,
      winnerPanelExiting: false,
      lobbyInfoVisible: true,
    })
    useLobbyModeStore.setState({ phase: 'roulette', pendingDraw: null, pendingVideoUrl: null })
    useLobbySyncStore.getState().reset()

    void syncServerClock()
      .catch(() => false)
      .then(() => {
        if (cancelled) return
        startServerClockResync()
        cleanupDraw = scheduleDraw(() => cancelled, true, (data) => {
          applyRoughServerTime(data.serverTimeMs)

          const lastDraw = data.lastDraw ?? (data.history[0] && { ...data.history[0], startTime: data.history[0].time })
          const lastDrawStartMs = lastDraw ? parseApiDateTime(lastDraw.startTime).getTime() : null
          useDrawCycleStore.getState().setDrawStartMs(lastDrawStartMs)
          if (lastDraw && lastDrawStartMs !== null) {
            cleanupJoin = joinDrawInProgress(
              { drawNo: lastDraw.drawNo, drawStartMs: lastDrawStartMs, result: lastDraw.result },
              setVideoErrorRound,
            )
          }
          // Tabla Winning Numbers de Quick Money: la misma que ya muestran las demás máquinas.
          void seedQuickMoneyDraws(serverNow())

          // Las demás máquinas muestran en el lobby los totales que pidieron BETS_LEAD_MS antes del
          // sorteo anterior: los de ESE sorteo, no los parciales del que viene. Pasado ese momento
          // del sorteo que viene, ya muestran los del pendiente.
          const nextDrawStartMs = parseApiDateTime(data.nextDraw.startTime).getTime()
          const betsDrawNo = serverNow() < nextDrawStartMs - BETS_LEAD_MS ? lastDraw?.drawNo : undefined
          const betsLoaded = fetchBetsSummary(betsDrawNo)
            .then((bets) => {
              if (cancelled) return
              useBetsSummaryStore.getState().setBetsSummary({
                liveTableBetsData: toLiveTableBetsData(bets),
                resultStatsData: toResultStatsData(bets),
              })
              // Highlights/fichas son de la mesa del video: en el lobby van apagados (ver clearHighlights
              // más abajo, cuando `active` vuelve a false).
              useBetsSummaryStore.getState().clearHighlights()
            })
            .catch((err) => console.error('No se pudo obtener /api/bets al arrancar', err))
          const timeout = new Promise((resolve) => setTimeout(resolve, BOOT_BETS_TIMEOUT_MS))
          void Promise.race([betsLoaded, timeout]).then(() => {
            if (!cancelled) useLobbySyncStore.getState().setBootDone()
          })
        })
      })

    return () => {
      cancelled = true
      cleanupDraw()
      cleanupJoin()
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

  // Polling de /api/bets (ver BETS_POLL_MS). Solo escribe en el store si la respuesta cambió: así
  // las celdas del panel solo pulsan cuando de verdad entra una apuesta, y no vuelve a encender los
  // highlights que clearHighlights() apagó al terminar el video si los totales siguen iguales.
  useEffect(() => {
    let stopped = false
    let inFlight = false
    let lastSnapshot = ''
    const poll = () => {
      if (inFlight) return
      inFlight = true
      fetchBetsSummaryOnce()
        .then((data) => {
          if (stopped) return
          const snapshot = JSON.stringify(data)
          if (snapshot === lastSnapshot) return
          lastSnapshot = snapshot
          useBetsSummaryStore.getState().setBetsSummary({
            liveTableBetsData: toLiveTableBetsData(data),
            resultStatsData: toResultStatsData(data),
          })
        })
        .catch(() => {
          // Silencioso: el próximo tick vuelve a intentar.
        })
        .finally(() => {
          inFlight = false
        })
    }
    poll()
    const intervalId = setInterval(poll, BETS_POLL_MS)
    return () => {
      stopped = true
      clearInterval(intervalId)
    }
  }, [])

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
      const msPastStart = serverNow() - parseApiDateTime(nextDrawStartTime).getTime()
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
      <RoundHistoryModal />
      <SyncOverlay />
    </>
  )
}

export default App
