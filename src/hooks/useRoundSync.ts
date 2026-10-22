import { useEffect } from 'react'
import { fetchGameInfo } from '../api/gameInfo'
import { applyGameInfo } from '../api/applyGameInfo'
import { fetchDrawResult } from '../api/drawResult'
import { useResultsStore } from '../store/useResultsStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { parseApiDateTime } from '../utils/time'
import { RESULT_HOLD_MS } from '../layout/layout.constants'
import { serverNow, syncServerClock } from '../time/serverClock'
import { onConnectionRestored } from './useConnectionIssue'

// Margen tras nextDrawStartTime antes de pedir /api/drawResult -- le da tiempo al backend a
// confirmar el número ganador (mismo tipo de margen que RESULT_LEAD_MS en App.tsx, pero medido
// hacia ADELANTE desde el start en vez de hacia atrás: ahí ese margen sirve para precargar el
// video ANTES del sorteo, acá no hay video, así que se pide DESPUÉS de que la ronda ya terminó).
const RESULT_CONFIRM_DELAY_MS = 1500
// Margen extra tras reabrir el tablero antes de volver a pedir /api/gameInfo por el próximo round
// -- le da tiempo al backend a publicarlo.
const NEXT_ROUND_DELAY_MS = 1500
// Autocontrol: el ciclo es una cadena de timers/fetches de una sola vez -- si cualquier eslabón
// no llega (pestaña en segundo plano con timers congelados por el navegador, un fetch colgado
// mientras el backend se reinicia, la PC que se suspende), nada lo retomaba y la página quedaba en
// 00:00 hasta recargarla a mano. Cada WATCHDOG_INTERVAL_MS (y al volver a la pestaña) se verifica
// que la ronda no esté vencida hace más de STUCK_AFTER_DRAW_MS; si lo está, se resincroniza desde
// cero. Un cambio de ronda normal tarda ~6s después del sorteo, así que 20s no interfiere.
const WATCHDOG_INTERVAL_MS = 5000
const STUCK_AFTER_DRAW_MS = 20_000

// Mantiene sincronizados nextDrawStartTime/drawNumber (useGameConfigStore), el historial de
// resultados (useResultsStore) y el estado "hay una ronda en curso" (useDrawCycleStore.active) --
// pensado para pantallas standalone (como RouletteBettingView) que necesitan round timing real
// pero no reproducen el video de resultado ni el resto de scheduleDraw en App.tsx (bets summary,
// preload de video, watchdog).
//
// El tablero se deshabilita/reactiva leyendo useDrawCycleStore.active (ver
// useBettingRoundPhase.ts) -- MISMO store/timer que usa el lobby real para mostrar el video de
// resultado, no un flag propio desincronizado. Se activa en el mismo instante en que el video
// arrancaría (nextDrawStartTime) y se desactiva RESULT_HOLD_MS después de confirmar el número
// (mismo margen que RouletteVideoView.tsx espera tras terminar su video antes de volver al
// lobby), aproximando "se acabó el video" sin reproducirlo.
//
// Recent Results normalmente se actualiza recién cuando el video de resultado termina (ver
// RouletteVideoView.tsx: addResult en el evento 'ended'). Sin video acá, se confirma el número
// real vía /api/drawResult apenas termina la ronda y se llama addResult directamente, en vez de
// esperar a que el próximo /api/gameInfo lo traiga de rebote.
export function useRoundSync() {
  useEffect(() => {
    let cancelled = false
    // Cada (re)sincronización arranca una generación nueva: los callbacks de una generación vieja
    // (un fetch que quedó colgado y responde tarde, por ejemplo) se descartan al llegar.
    let generation = 0
    // Hora del sorteo de la ronda que se está siguiendo -- null mientras se pide /gameInfo.
    let trackedDrawMs: number | null = null
    let gameInfoTimer: ReturnType<typeof setTimeout> | undefined
    let startTimer: ReturnType<typeof setTimeout> | undefined
    let resultTimer: ReturnType<typeof setTimeout> | undefined
    let closeTimer: ReturnType<typeof setTimeout> | undefined

    function clearRoundTimers() {
      clearTimeout(gameInfoTimer)
      clearTimeout(startTimer)
      clearTimeout(resultTimer)
      clearTimeout(closeTimer)
    }

    // seedHistory solo en la primera carga -- de ahí en más el historial crece exclusivamente vía
    // addResult (mismo criterio que aplica applyGameInfo.ts/App.tsx: volver a hidratar desde
    // /gameInfo en cada ciclo pisaría el resultado real recién agregado).
    function scheduleGameInfoPoll(seedHistory: boolean) {
      const gen = ++generation
      const stale = () => cancelled || gen !== generation
      trackedDrawMs = null

      fetchGameInfo()
        .then((data) => {
          if (stale()) return
          applyGameInfo(data, { seedHistory })

          const { drawNo, startTime } = data.nextDraw
          const drawMs = parseApiDateTime(startTime).getTime()
          trackedDrawMs = drawMs
          const msUntilStart = Math.max(0, drawMs - serverNow())
          // Ronda que todavía no arrancó: el tablero va abierto. En el ciclo normal ya lo está; tras
          // una reconexión puede venir de una ronda que terminó durante el corte.
          if (msUntilStart > 0) useDrawCycleStore.getState().setActive(false)

          startTimer = setTimeout(() => {
            if (stale()) return
            useDrawCycleStore.getState().setActive(true)
          }, msUntilStart)

          resultTimer = setTimeout(() => {
            if (stale()) return
            fetchDrawResult(drawNo)
              .then(({ result }) => {
                if (stale()) return
                useResultsStore.getState().addResult({
                  id: drawNo,
                  timestamp: serverNow(),
                  drawNumber: drawNo,
                  winningNumber: result,
                })
              })
              .catch((err) => console.error('No se pudo confirmar /api/drawResult', err))
              .finally(() => {
                if (stale()) return
                closeTimer = setTimeout(() => {
                  if (stale()) return
                  useDrawCycleStore.getState().setActive(false)
                  gameInfoTimer = setTimeout(() => scheduleGameInfoPoll(false), NEXT_ROUND_DELAY_MS)
                }, RESULT_HOLD_MS)
              })
          }, msUntilStart + RESULT_CONFIRM_DELAY_MS)
        })
        .catch((err) => {
          console.error('No se pudo sincronizar /api/gameInfo', err)
          if (!stale()) gameInfoTimer = setTimeout(() => scheduleGameInfoPoll(seedHistory), 5000)
        })
    }

    // Ronda vencida hace demasiado (ver STUCK_AFTER_DRAW_MS): descarta la cadena actual y vuelve
    // a pedir /gameInfo desde cero.
    function resyncIfStuck() {
      if (cancelled || trackedDrawMs === null) return
      if (serverNow() - trackedDrawMs < STUCK_AFTER_DRAW_MS) return
      console.warn('[roundSync] la ronda no avanzó después del sorteo -- resincronizando')
      clearRoundTimers()
      useDrawCycleStore.getState().setActive(false)
      scheduleGameInfoPoll(false)
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') resyncIfStuck()
    }

    // Volvió la conexión: durante el corte se pudieron perder el cambio de ronda, el /drawResult y
    // el desvío del reloj. Se re-mide el reloj primero (los timers de la ronda se calculan con
    // serverNow()) y se vuelve a pedir /gameInfo desde cero, re-hidratando también el historial de
    // resultados -- acá sí conviene pisarlo, porque lo que haya en pantalla puede tener huecos.
    // `active` no se toca: si la ronda sigue en curso el tablero queda cerrado sin parpadear, y si
    // ya terminó lo reabre scheduleGameInfoPoll.
    function resyncAfterReconnect() {
      console.info('[roundSync] conexión recuperada -- resincronizando ronda, reloj y resultados')
      void syncServerClock().finally(() => {
        if (cancelled) return
        clearRoundTimers()
        scheduleGameInfoPoll(true)
      })
    }

    scheduleGameInfoPoll(true)
    const watchdog = setInterval(resyncIfStuck, WATCHDOG_INTERVAL_MS)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    const stopRestored = onConnectionRestored('terminal', resyncAfterReconnect)

    return () => {
      cancelled = true
      stopRestored()
      clearInterval(watchdog)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearRoundTimers()
      // Este hook es el único que pone `active` en true en esta pantalla (no hay video/App.tsx
      // corriendo acá) -- si se desmonta a mitad de una ronda, lo libera para no dejar el store
      // compartido trabado en true.
      useDrawCycleStore.getState().setActive(false)
    }
  }, [])
}
