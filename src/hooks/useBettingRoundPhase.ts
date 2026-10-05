import { useCountdown, type Countdown } from './useCountdown'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useGameConfigStore } from '../store/useGameConfigStore'

export type BettingRoundPhase = 'open' | 'closingSoon' | 'closed'

// No hay un enum de estado de ronda expuesto por el backend -- se deriva client-side reusando las
// mismas fuentes que ya orquestan el resto de la lobby: useDrawCycleStore.active (true mientras
// corre el video de sorteo, mismo flag que usa App.tsx) y el countdown compartido (useCountdown,
// mismo `urgent` <=10s). No se inventa un segundo timer independiente.
//
// El countdown apunta al CIERRE de apuestas (/gameInfo nextDraw.betsCloseTime: en Roulette T-2:35,
// antes del sorteo) -- el backend rechaza tickets desde ahí. closingSoon (<=10s del cierre) ya
// bloquea el tablero como margen (ver RouletteBettingWorkspace) y desde el cierre la ronda queda
// 'closed' hasta que termina el sorteo. Sin betsCloseTime (backend anterior) cae a la hora del
// sorteo, como antes.
export function useBettingRoundPhase(): { phase: BettingRoundPhase; countdown: Countdown } {
  const nextDrawStartTime = useGameConfigStore((state) => state.nextDrawStartTime)
  const betsCloseTime = useGameConfigStore((state) => state.betsCloseTime)
  const active = useDrawCycleStore((state) => state.active)
  const closeTime = betsCloseTime || nextDrawStartTime
  const countdown = useCountdown(closeTime)
  const betsClosed = betsCloseTime !== '' && countdown.remainingSeconds <= 0
  const phase: BettingRoundPhase = active || betsClosed ? 'closed' : countdown.urgent ? 'closingSoon' : 'open'
  return { phase, countdown }
}
