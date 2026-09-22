import { useEffect } from 'react'
import { fetchGameInfo } from '../api/gameInfo'
import { applyGameInfo } from '../api/applyGameInfo'
import { fetchDrawResult } from '../api/drawResult'
import { useResultsStore } from '../store/useResultsStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { parseApiDateTime } from '../utils/time'
import { RESULT_HOLD_MS } from '../layout/layout.constants'

// Margen tras nextDrawStartTime antes de pedir /api/drawResult -- le da tiempo al backend a
// confirmar el número ganador (mismo tipo de margen que RESULT_LEAD_MS en App.tsx, pero medido
// hacia ADELANTE desde el start en vez de hacia atrás: ahí ese margen sirve para precargar el
// video ANTES del sorteo, acá no hay video, así que se pide DESPUÉS de que la ronda ya terminó).
const RESULT_CONFIRM_DELAY_MS = 1500
// Margen extra tras reabrir el tablero antes de volver a pedir /api/gameInfo por el próximo round
// -- le da tiempo al backend a publicarlo.
const NEXT_ROUND_DELAY_MS = 1500

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
    let gameInfoTimer: ReturnType<typeof setTimeout> | undefined
    let startTimer: ReturnType<typeof setTimeout> | undefined
    let resultTimer: ReturnType<typeof setTimeout> | undefined
    let closeTimer: ReturnType<typeof setTimeout> | undefined

    // seedHistory solo en la primera carga -- de ahí en más el historial crece exclusivamente vía
    // addResult (mismo criterio que aplica applyGameInfo.ts/App.tsx: volver a hidratar desde
    // /gameInfo en cada ciclo pisaría el resultado real recién agregado).
    function scheduleGameInfoPoll(seedHistory: boolean) {
      fetchGameInfo()
        .then((data) => {
          if (cancelled) return
          applyGameInfo(data, { seedHistory })

          const { drawNo, startTime } = data.nextDraw
          const msUntilStart = Math.max(0, parseApiDateTime(startTime).getTime() - Date.now())

          startTimer = setTimeout(() => {
            if (cancelled) return
            useDrawCycleStore.getState().setActive(true)
          }, msUntilStart)

          resultTimer = setTimeout(() => {
            if (cancelled) return
            fetchDrawResult(drawNo)
              .then(({ result }) => {
                if (cancelled) return
                useResultsStore.getState().addResult({
                  id: drawNo,
                  timestamp: Date.now(),
                  drawNumber: drawNo,
                  winningNumber: result,
                })
              })
              .catch((err) => console.error('No se pudo confirmar /api/drawResult', err))
              .finally(() => {
                if (cancelled) return
                closeTimer = setTimeout(() => {
                  if (cancelled) return
                  useDrawCycleStore.getState().setActive(false)
                  gameInfoTimer = setTimeout(() => scheduleGameInfoPoll(false), NEXT_ROUND_DELAY_MS)
                }, RESULT_HOLD_MS)
              })
          }, msUntilStart + RESULT_CONFIRM_DELAY_MS)
        })
        .catch((err) => {
          console.error('No se pudo sincronizar /api/gameInfo', err)
          if (!cancelled) gameInfoTimer = setTimeout(() => scheduleGameInfoPoll(seedHistory), 5000)
        })
    }

    scheduleGameInfoPoll(true)

    return () => {
      cancelled = true
      clearTimeout(gameInfoTimer)
      clearTimeout(startTimer)
      clearTimeout(resultTimer)
      clearTimeout(closeTimer)
      // Este hook es el único que pone `active` en true en esta pantalla (no hay video/App.tsx
      // corriendo acá) -- si se desmonta a mitad de una ronda, lo libera para no dejar el store
      // compartido trabado en true.
      useDrawCycleStore.getState().setActive(false)
    }
  }, [])
}
