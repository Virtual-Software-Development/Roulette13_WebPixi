import { useCountdown, type Countdown } from './useCountdown'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useGameConfigStore } from '../store/useGameConfigStore'

export type BettingRoundPhase = 'open' | 'closingSoon' | 'closed'

// No hay un enum de estado de ronda expuesto por el backend (ver investigación: gameInfo solo da
// nextDraw.startTime) -- se deriva client-side reusando las mismas fuentes que ya orquestan el
// resto de la lobby: useDrawCycleStore.active (true mientras corre el video de sorteo, mismo flag
// que usa App.tsx) y el countdown compartido (useCountdown, mismo `urgent` <=10s que ya usan
// LastGame/RouletteNextResultPanel). No se inventa un segundo timer independiente.
export function useBettingRoundPhase(): { phase: BettingRoundPhase; countdown: Countdown } {
  const nextDrawStartTime = useGameConfigStore((state) => state.nextDrawStartTime)
  const active = useDrawCycleStore((state) => state.active)
  const countdown = useCountdown(nextDrawStartTime)
  const phase: BettingRoundPhase = active ? 'closed' : countdown.urgent ? 'closingSoon' : 'open'
  return { phase, countdown }
}
