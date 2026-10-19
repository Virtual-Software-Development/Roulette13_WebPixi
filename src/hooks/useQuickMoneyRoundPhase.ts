import { useCountdown, type Countdown } from './useCountdown'
import { useQuickMoneyRoundStore } from '../store/useQuickMoneyRoundStore'
import type { BettingRoundPhase } from './useBettingRoundPhase'
import { useConnectionIssue } from './useConnectionIssue'

// Quick Money's useBettingRoundPhase. With the store synced to the backend (live), the countdown
// targets the draw's betting close -- the backend rejects tickets from then on -- and the phase is
// 'closed' from there until the next draw opens (or while no draw is open at all). In mock mode
// (not synced) nothing is ever closed, as before.
export function useQuickMoneyRoundPhase(): { phase: BettingRoundPhase; countdown: Countdown; live: boolean; eventId: number | null } {
  const live = useQuickMoneyRoundStore((state) => state.live)
  const eventId = useQuickMoneyRoundStore((state) => state.eventId)
  const betsCloseTime = useQuickMoneyRoundStore((state) => state.betsCloseTime)
  const nextDrawTime = useQuickMoneyRoundStore((state) => state.nextDrawTime)
  const countdown = useCountdown(live ? betsCloseTime : nextDrawTime)
  // Sin conexión confiable (ver ConnectionBanner) se cierra también en modo mock: no se arma un
  // ticket que no se va a poder enviar.
  const connectionIssue = useConnectionIssue('betting')

  let phase: BettingRoundPhase = 'open'
  if (live) {
    if (eventId === null || countdown.remainingSeconds <= 0) phase = 'closed'
    else if (countdown.urgent) phase = 'closingSoon'
  }
  if (connectionIssue) phase = 'closed'
  return { phase, countdown, live, eventId }
}
