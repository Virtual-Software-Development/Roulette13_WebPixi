import { useEffect } from 'react'
import { fetchCurrentEvent } from '../api/terminalTicket'
import { useQuickMoneyRoundStore } from '../store/useQuickMoneyRoundStore'

// How often the betting page re-reads the open Quick Money draw. The backend creates the next draw
// on its own clock, so polling (cheap: one small public GET) is what notices it -- same reasoning
// as the roulette page's watchdog (useRoundSync) not trusting a single timer.
const POLL_MS = 3000

// Keeps useQuickMoneyRoundStore on the draw the backend has open for betting. Mounted by
// QuickMoneyBettingView only: the lobby still runs the mock cycle.
export function useQuickMoneyEventSync() {
  useEffect(() => {
    let cancelled = false
    let generation = 0

    async function sync() {
      const mine = ++generation
      try {
        const event = await fetchCurrentEvent('lottery')
        // A slower, older response must not overwrite a newer one.
        if (!cancelled && mine === generation) useQuickMoneyRoundStore.getState().setLiveEvent(event)
      } catch (err) {
        // Keep showing the last known draw; the next poll retries.
        console.error('[quickMoney] could not read the current draw:', err instanceof Error ? err.message : err)
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') void sync()
    }

    void sync()
    const interval = setInterval(() => void sync(), POLL_MS)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])
}
