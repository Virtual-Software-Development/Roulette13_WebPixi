import { useCountdown, type Countdown } from './useCountdown'
import { useQuickMoneyRoundStore } from '../store/useQuickMoneyRoundStore'
import type { BettingRoundPhase } from './useBettingRoundPhase'

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

  let phase: BettingRoundPhase = 'open'
  if (live) {
    if (eventId === null || countdown.remainingSeconds <= 0) phase = 'closed'
    else if (countdown.urgent) phase = 'closingSoon'
  }
  return { phase, countdown, live, eventId }
}
