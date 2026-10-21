import { useCallback, useEffect, useRef, useState } from 'react'
import { Application } from '@pixi/react'
import { RouletteVideoView } from './screens/RouletteVideoView'
import { RouletteLobby } from './screens/RouletteLobby'
import { LobbyBackgroundLayer } from './screens/LobbyBackgroundLayer'
import { WinnerPanel } from './screens/WinnerPanel'
import { DrawSummaryHost } from './screens/DrawSummaryHost'
import { VideoErrorRound, type VideoErrorRoundInfo } from './screens/VideoErrorRound'
import { ResponsiveStage } from './layout/ResponsiveStage'
import { VideoPoolLayer } from './video/VideoPoolLayer'
import {
  DRAW_VIDEO_SLOT_ID,
  getVideoSlot,
  loadVideoSrc,
  preloadDrawVideoBlob,
  releaseDrawVideoBlob,
  resetVideoSlot,
} from './video/videoElements'
import { fetchGameInfo } from './api/gameInfo'
import { applyGameInfo } from './api/applyGameInfo'
import { fetchDrawResult } from './api/drawResult'
import { fetchLastResults } from './api/lastResults'
import { fetchBetsSummary, fetchBetsSummaryOnce } from './api/betsSummary'
import { useGameConfigStore } from './store/useGameConfigStore'
import { useDrawCycleStore } from './store/useDrawCycleStore'
import { useResultsStore } from './store/useResultsStore'
import { useBetsSummaryStore } from './store/useBetsSummaryStore'
import { pickDrawResultVideoUrl } from './utils/media'
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
import { LOBBY_RETURN_OFFSET_MS, VIDEO_WINDOW_END_OFFSET_MS } from './sync/lobbyTimeline'
import { commitPendingResult } from './store/commitPendingResult'
import { seedQuickMoneyDraws } from './sync/quickMoneyHistory'
import { SyncOverlay } from './screens/SyncOverlay'
import type { GameInfoResponse } from './types/gameInfo'
import type { BetsSummaryResponse } from './types/betsSummary'
import { ROULETTE_BETS_TOPIC, onMqttMessage } from './mqtt/topics'
import { IS_LAN_VIEWER } from './lanPreview'

// Cuánto antes de la hora del sorteo se pide /drawResult y se precarga el clip. El backend ejecuta el
// sorteo ~2s antes (resultRevealLead), así que el resultado ya existe -- con más margen de precarga,
// menos máquinas arrancan el video tarde respecto de las demás.
const RESULT_LEAD_MS = 1800
// Momento en que se pide /api/bets -- pedido explícito: "10 segundos para cargar el video". Mismo
// timer que ya agenda resultTimer/startTimer (scheduleDraw, basado en nextDraw.startTime), no uno
// nuevo independiente.
const BETS_LEAD_MS = 10_000
// Las apuestas en vivo llegan por MQTT (ver el efecto de ROULETTE_BETS_TOPIC más abajo). Solo el
// espectador de dev:lan, que no tiene MQTT, sigue pidiendo /api/bets cada pocos segundos.
const LAN_VIEWER_BETS_POLL_MS = 3000
// Margen, contado desde la hora programada del sorteo, para que el video termine de cargar. Pasado
// esto (o antes, si la carga falla del todo) la ronda se muestra con VideoErrorRound en lugar del
// video. Corto a propósito: mientras se espera, esta máquina sigue en el lobby y las demás ya
// están mostrando el video.
const VIDEO_LOAD_GRACE_MS = 3000
// Tope de espera de las apuestas del lobby al arrancar, antes de sacar "Sincronizando…" igual.
const BOOT_BETS_TIMEOUT_MS = 4000
// Margen sobre la hora en que todas las máquinas vuelven al lobby (LOBBY_RETURN_OFFSET_MS) antes de
// que el failsafe de ronda cierre a la fuerza una ronda que no volvió sola (ver más abajo).
const ROUND_FAILSAFE_GRACE_MS = 3000

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
  // Para el failsafe de ronda (más abajo), que lee el estado actual desde un timer.
  const videoMountedRef = useRef(false)
  const videoErrorRoundRef = useRef<VideoErrorRoundInfo | null>(null)
  videoMountedRef.current = videoMounted
  videoErrorRoundRef.current = videoErrorRound
  // drawStartMs de la última ronda que ya agendó el sorteo siguiente (handleRoundEnded).
  const roundEndedForRef = useRef<number | null>(null)

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
          // Corta la descarga del clip si no llega a tiempo: sin esto seguía en segundo plano y
          // terminaba cargando el slot en plena ronda de VideoErrorRound.
          const download = new AbortController()

          // El backend genera el resultado unos instantes antes de la hora del sorteo, y a veces más
          // tarde (bloqueo compartido con Quick Money, o el backend reiniciándose). Se sigue pidiendo
          // hasta que termina la ventana del video: si llega tarde para el video, igual se muestra en
          // el panel de video no disponible (más abajo) y entra al historial con la ronda.
          const resultFetched = fetchDrawResult(drawNo, { until: drawStartMs + VIDEO_WINDOW_END_OFFSET_MS })

          const videoLoaded = resultFetched.then(async ({ result, video, videoFile }) => {
            draw.result = result
            // Mismo clip en todas las máquinas (ver pickDrawResultVideoUrl): la variante que elige el
            // backend, o si no viene, la identidad del sorteo, igual para todas.
            const videoUrl = await pickDrawResultVideoUrl(result, video ?? null, `${drawStartMs}-${drawNo}`, videoFile)
            // Entero a memoria antes de darlo por listo (ver preloadDrawVideoBlob).
            const blobUrl = await preloadDrawVideoBlob(videoUrl, download.signal)
            await loadVideoSrc(getVideoSlot(DRAW_VIDEO_SLOT_ID), blobUrl)
            console.info(`[drawVideo] ${drawNo}: clip ${decodeURIComponent(videoUrl)} listo ${Math.round(serverNow() - drawStartMs)}ms respecto del sorteo`)
            return blobUrl
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
              download.abort()
              if (isCancelled()) return { kind: 'error', result: null }
              // Corta la descarga si quedó colgada a mitad de camino.
              resetVideoSlot(getVideoSlot(DRAW_VIDEO_SLOT_ID))
              releaseDrawVideoBlob()
              // El resultado es real aunque el video no haya cargado -- se registra igual, en el
              // instante en que el video habría terminado (ver VideoErrorRound). Si drawResult
              // nunca llegó, no hay número que registrar.
              if (draw.result !== null) {
                useDrawCycleStore.getState().setPendingResult({ drawNo, result: draw.result })
              } else {
                // Resultado todavía sin llegar: la ronda arranca igual con el panel (sin número) y,
                // si el resultado llega antes del final de la ventana del video, el panel lo revela.
                resultFetched
                  .then(({ result }) => {
                    if (isCancelled() || serverNow() >= drawStartMs + VIDEO_WINDOW_END_OFFSET_MS) return
                    console.info(`[drawResult] ${drawNo}: llegó tarde para el video, se muestra en el panel`)
                    useDrawCycleStore.getState().setPendingResult({ drawNo, result })
                    setVideoErrorRound((round) =>
                      round && round.drawStartMs === drawStartMs && round.result === null ? { ...round, result } : round,
                    )
                  })
                  .catch(() => {
                    // Nunca llegó: la ronda termina sin número, como las demás que no lo recibieron.
                  })
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
    useLobbyModeStore.setState({ phase: 'roulette', pendingDraw: null, pendingVideoUrl: null, pendingDrawAtMs: null })
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

  // Apuestas en vivo de la ronda abierta, sumadas en toda la flota: el backend las publica por MQTT
  // (ROULETTE_BETS_TOPIC) cada vez que se guarda un ticket y al abrir cada ronda -- ninguna máquina
  // vuelve a pedir /api/bets cada pocos segundos. Solo escribe en el store si los totales cambiaron:
  // así las celdas del panel solo pulsan cuando de verdad entra una apuesta, y no vuelve a encender
  // los highlights que clearHighlights() apagó al terminar el video si llega de nuevo el mismo
  // resumen (el mensaje es retenido: se recibe otra vez en cada reconexión).
  useEffect(() => {
    let stopped = false
    let lastSnapshot = ''
    const apply = (data: BetsSummaryResponse) => {
      if (stopped) return
      const snapshot = JSON.stringify(data)
      if (snapshot === lastSnapshot) return
      lastSnapshot = snapshot
      useBetsSummaryStore.getState().setBetsSummary({
        liveTableBetsData: toLiveTableBetsData(data),
        resultStatsData: toResultStatsData(data),
      })
    }

    // Espectador de dev:lan: no tiene conexión MQTT (lanPreview.ts), así que sigue preguntando.
    if (IS_LAN_VIEWER) {
      let inFlight = false
      const poll = () => {
        if (inFlight) return
        inFlight = true
        fetchBetsSummaryOnce()
          .then(apply)
          .catch(() => {
            // Silencioso: el próximo tick vuelve a intentar.
          })
          .finally(() => {
            inFlight = false
          })
      }
      poll()
      const intervalId = setInterval(poll, LAN_VIEWER_BETS_POLL_MS)
      return () => {
        stopped = true
        clearInterval(intervalId)
      }
    }

    const unsubscribe = onMqttMessage(ROULETTE_BETS_TOPIC, (message) => {
      const data = message as Partial<BetsSummaryResponse> | null
      if (data?.msgType === 'betsSummary' && data.numbers) apply(data as BetsSummaryResponse)
    })
    return () => {
      stopped = true
      unsubscribe()
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
    roundEndedForRef.current = useDrawCycleStore.getState().drawStartMs
    scheduleDraw(() => false, false)
  }, [scheduleDraw])

  // Failsafe de ronda: la secuencia del lobby sigue la línea de tiempo del servidor, pase lo que pase
  // con el resultado o el video. El camino normal depende de eventos -- el 'ended' del video agenda
  // el hold, el ticker de Pixi baja la rueda y recién eso (onFullyExited) saca el panel Winner -- y si
  // uno no llega (video trabado en el último cuadro, ticker detenido, resultado o backend ausentes)
  // la pantalla quedaba congelada para siempre: el watchdog de más abajo no mira mientras hay una
  // ronda montada. A la hora en que todas las máquinas ya volvieron al lobby (LOBBY_RETURN_OFFSET_MS,
  // más un margen) se cierra a la fuerza lo que haya quedado y se agenda el sorteo siguiente si la
  // ronda no llegó a hacerlo.
  const roundDrawStartMs = useDrawCycleStore((state) => state.drawStartMs)
  useEffect(() => {
    if (roundDrawStartMs === null) return
    const failsafeAt = roundDrawStartMs + LOBBY_RETURN_OFFSET_MS + ROUND_FAILSAFE_GRACE_MS
    const timer = setTimeout(() => {
      const cycle = useDrawCycleStore.getState()
      if (cycle.drawStartMs !== roundDrawStartMs) return
      const stuck =
        cycle.active ||
        cycle.winnerPanelNumber !== null ||
        !cycle.lobbyInfoVisible ||
        videoMountedRef.current ||
        videoErrorRoundRef.current !== null
      if (!stuck) return
      console.warn('[round] la ronda no volvió al lobby a la hora del servidor -- se cierra', {
        drawStartMs: new Date(roundDrawStartMs).toISOString(),
        active: cycle.active,
        winnerPanel: cycle.winnerPanelNumber,
        videoMounted: videoMountedRef.current,
        videoErrorRound: videoErrorRoundRef.current !== null,
      })
      if (cycle.pendingResult) commitPendingResult()
      resetVideoSlot(getVideoSlot(DRAW_VIDEO_SLOT_ID))
      releaseDrawVideoBlob()
      setVideoMounted(false)
      setVideoErrorRound(null)
      useDrawCycleStore.setState({
        active: false,
        videoArrived: false,
        videoSlideProgress: 0,
        winnerPanelNumber: null,
        winnerPanelExiting: false,
        lobbyInfoVisible: true,
      })
      if (roundEndedForRef.current !== roundDrawStartMs) {
        roundEndedForRef.current = roundDrawStartMs
        scheduleDraw(() => false, false)
      }
    }, Math.max(0, failsafeAt - serverNow()))
    return () => clearTimeout(timer)
  }, [roundDrawStartMs, scheduleDraw])

  // Fin de una ronda mostrada con VideoErrorRound -- el panel ya salió y el lobby volvió.
  const handleVideoErrorRoundFinished = useCallback(() => {
    setVideoErrorRound(null)
  }, [])

  // El video arrancó pero no se puede mostrar bien (sin cuadros pintados aunque suene, error de
  // decodificación, trabado, o llegó demasiado tarde para alcanzar a las demás -- ver
  // video/drawVideoMonitor.ts): se cambia en caliente a VideoErrorRound, que sigue la MISMA línea de
  // tiempo absoluta, así esta máquina revela el número y vuelve al lobby junto con las demás en vez
  // de quedarse con un video invisible o atrasado. revealAtMs: el instante en que el clip (el mismo
  // en todas las máquinas) revela el número.
  const handlePlaybackFailed = useCallback((revealAtMs: number | null) => {
    const { drawStartMs, pendingResult } = useDrawCycleStore.getState()
    if (drawStartMs === null) return
    resetVideoSlot(getVideoSlot(DRAW_VIDEO_SLOT_ID))
    releaseDrawVideoBlob()
    // VideoErrorRound no mueve la rueda del lobby: queda en su lugar como en el camino de error normal.
    useDrawCycleStore.getState().setVideoSlideProgress(0)
    setVideoMounted(false)
    setVideoErrorRound({ drawStartMs, result: pendingResult?.result ?? null, revealAtMs: revealAtMs ?? undefined })
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
      <DrawSummaryHost />
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
          {videoMounted && (
            <RouletteVideoView
              onEnded={handleRoundEnded}
              onFullyExited={handleFullyExited}
              onPlaybackFailed={handlePlaybackFailed}
            />
          )}
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
