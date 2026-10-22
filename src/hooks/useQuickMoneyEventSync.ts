import { useEffect } from 'react'
import { fetchCurrentEvent } from '../api/terminalTicket'
import { LOTTERY_EVENT_TOPIC, onMqttMessage } from '../mqtt/topics'
import { useQuickMoneyRoundStore } from '../store/useQuickMoneyRoundStore'

// The backend announces every change of a Quick Money draw over MQTT (LOTTERY_EVENT_TOPIC): the ones
// that change which draw is open make the page re-read it (shouldResync). The poll is only a safety
// net for a lost connection -- same reasoning as the roulette page's watchdog (useRoundSync) not
// trusting a single signal.
const POLL_MS = 60_000

// /events/lottery/current is the earliest draw not drawn yet. It changes when a draw opens
// ("sugerido") or starts drawing ("en_curso"); closing bets ("congelado") of the draw already shown
// and settling ("liquidado") one already gone do not. A message about any other draw (e.g. the
// retained one after a reconnection that missed the opening) re-reads too.
export function shouldResync(message: unknown, shownEventId: number | null): boolean {
  if (!message || typeof message !== 'object') return true
  const { estado, eventId } = message as { estado?: unknown; eventId?: unknown }
  if (estado === 'liquidado') return false
  if (estado === 'congelado') return eventId !== shownEventId
  return true
}

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
    // The message is only the signal: /events/lottery/current stays the one source of the open draw.
    const unsubscribe = onMqttMessage(LOTTERY_EVENT_TOPIC, (message) => {
      if (shouldResync(message, useQuickMoneyRoundStore.getState().eventId)) void sync()
    })
    const interval = setInterval(() => void sync(), POLL_MS)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      cancelled = true
      unsubscribe()
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])
}
