import { useEffect } from 'react'
import { LOBBY_GROUP_KEYS, LOBBY_NUMBER_KEYS, useLobbyLiveBetsSimStore } from '../store/useLobbyLiveBetsSimStore'

const MIN_INTERVAL_MS = 500
const MAX_INTERVAL_MS = 1500
const MIN_BET_AMOUNT = 5
const MAX_BET_AMOUNT = 250
// Las apuestas a un número puntual son más frecuentes que a un grupo (docena/columna/exterior),
// igual que en una mesa real -- pura calibración visual, no viene de ningún dato real.
const NUMBER_BET_PROBABILITY = 0.7

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

// Simulador placeholder: todavía no hay backend que emita apuestas individuales en tiempo real, así
// que este hook alimenta useLobbyLiveBetsSimStore con apuestas al azar mientras el panel está
// visible. Cuando exista un feed real (polling/websocket), se reemplaza este hook por uno que llame
// a los mismos registerNumberBet/registerGroupBet con datos reales -- el store y el panel no
// cambian.
//
// Al ocultarse (enabled pasa a false, ver lobbyInfoVisible en LobbyLiveBetsPanel) se resetean los
// totales -- pedido explícito: el panel debe reaparecer en 0, no retomar los montos de la ronda
// anterior. Se resetea EN ESE MOMENTO (no cuando vuelve a aparecer) para que ya esté limpio bastante
// antes de que el panel sea visible de nuevo.
export function useLobbyBetsSimulation(enabled: boolean) {
  const registerNumberBet = useLobbyLiveBetsSimStore((state) => state.registerNumberBet)
  const registerGroupBet = useLobbyLiveBetsSimStore((state) => state.registerGroupBet)
  const reset = useLobbyLiveBetsSimStore((state) => state.reset)

  useEffect(() => {
    if (!enabled) {
      reset()
      return
    }

    let timeoutId: ReturnType<typeof setTimeout>

    function tick() {
      const amount = Math.round(randomInRange(MIN_BET_AMOUNT, MAX_BET_AMOUNT))
      if (Math.random() < NUMBER_BET_PROBABILITY) {
        registerNumberBet(randomItem(LOBBY_NUMBER_KEYS), amount)
      } else {
        registerGroupBet(randomItem(LOBBY_GROUP_KEYS), amount)
      }
      timeoutId = setTimeout(tick, randomInRange(MIN_INTERVAL_MS, MAX_INTERVAL_MS))
    }

    timeoutId = setTimeout(tick, randomInRange(MIN_INTERVAL_MS, MAX_INTERVAL_MS))
    return () => clearTimeout(timeoutId)
  }, [enabled, registerNumberBet, registerGroupBet, reset])
}
