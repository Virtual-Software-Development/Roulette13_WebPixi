import { useEffect, useState } from 'react'
import { parseApiDateTime } from '../utils/time'

const TICK_INTERVAL_MS = 200
const URGENT_THRESHOLD_SECONDS = 10

export interface Countdown {
  remainingSeconds: number
  display: string
  urgent: boolean
}

function computeRemainingMs(targetIso: string): number {
  if (!targetIso) return 0
  return Math.max(0, parseApiDateTime(targetIso).getTime() - Date.now())
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function useCountdown(targetIso: string): Countdown {
  const [remainingMs, setRemainingMs] = useState(() => computeRemainingMs(targetIso))

  useEffect(() => {
    setRemainingMs(computeRemainingMs(targetIso))

    if (!targetIso) return

    const intervalId = setInterval(() => {
      setRemainingMs(computeRemainingMs(targetIso))
    }, TICK_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [targetIso])

  const remainingSeconds = Math.ceil(remainingMs / 1000)

  return {
    remainingSeconds,
    display: formatCountdown(remainingSeconds),
    urgent: remainingSeconds <= URGENT_THRESHOLD_SECONDS,
  }
}
