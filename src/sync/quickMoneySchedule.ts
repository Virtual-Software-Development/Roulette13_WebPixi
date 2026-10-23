import { create } from 'zustand'
import { fetchCurrentEvent } from '../api/terminalTicket'
import { fetchQuickMoneyRoundHistory } from '../api/roundHistory'
import { LOTTERY_EVENT_TOPIC, onMqttMessage } from '../mqtt/topics'

// The real Quick Money schedule as the lobby needs it: when the next draw is (and its number) and
// when the last one was. Quick Money is drawn at its own times of the day (the Admin's Programming
// page), so the lobby's Quick Money block is anchored to these -- never computed from the roulette.
//
// The next draw is the backend's earliest Quick Money round not drawn yet (GET
// /events/lottery/current), read at start, on every Quick Money round message over MQTT (a round
// opening, closing or being drawn) and every minute as a safety net. The last draw is the previous
// next one once it has been drawn, or at start the newest round in the history.

// Safety net for a lost MQTT connection: the next draw is hours away, so a minute is plenty.
const REFRESH_MS = 60_000

interface QuickMoneyScheduleState {
  nextDrawAtMs: number | null
  nextDrawNumber: string | null
  lastDrawAtMs: number | null
}

export const useQuickMoneyScheduleStore = create<QuickMoneyScheduleState>(() => ({
  nextDrawAtMs: null,
  nextDrawNumber: null,
  lastDrawAtMs: null,
}))

// Applies a fresh read of the next draw: when it moved past the one known so far and that one's time
// has come, that one is the last draw now.
export function applyNextDraw(next: { drawAtMs: number; drawNumber: string } | null, nowMs: number): void {
  const state = useQuickMoneyScheduleStore.getState()
  let lastDrawAtMs = state.lastDrawAtMs
  if (state.nextDrawAtMs !== null && (next === null || next.drawAtMs > state.nextDrawAtMs) && state.nextDrawAtMs <= nowMs + 5_000) {
    lastDrawAtMs = Math.max(lastDrawAtMs ?? 0, state.nextDrawAtMs)
  }
  useQuickMoneyScheduleStore.setState({
    nextDrawAtMs: next?.drawAtMs ?? null,
    nextDrawNumber: next?.drawNumber ?? null,
    lastDrawAtMs,
  })
}

async function refresh(now: () => number): Promise<void> {
  try {
    const event = await fetchCurrentEvent('lottery')
    applyNextDraw(event ? { drawAtMs: new Date(event.horaProgramada).getTime(), drawNumber: event.numeroEvento } : null, now())
  } catch (err) {
    console.warn('[quickMoneySchedule] could not read the next Quick Money draw:', err instanceof Error ? err.message : err)
  }
}

let started = false

// Started by the lobby's Quick Money cycle; later calls do nothing. now: the server clock.
export function startQuickMoneyScheduleSync(now: () => number): void {
  if (started) return
  started = true
  void fetchQuickMoneyRoundHistory()
    .then((entries) => {
      const newest = entries[0]
      if (!newest) return
      const drawAtMs = new Date(newest.horaProgramada).getTime()
      const { lastDrawAtMs } = useQuickMoneyScheduleStore.getState()
      if (lastDrawAtMs === null || drawAtMs > lastDrawAtMs) useQuickMoneyScheduleStore.setState({ lastDrawAtMs: drawAtMs })
    })
    .catch(() => {})
  void refresh(now)
  onMqttMessage(LOTTERY_EVENT_TOPIC, () => void refresh(now))
  setInterval(() => void refresh(now), REFRESH_MS)
}
