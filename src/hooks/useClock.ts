import { useEffect, useState } from 'react'

export interface Clock {
  date: string
  time: string
}

function formatClock(now: Date): Clock {
  return {
    date: now.toLocaleDateString('en-US'),
    time: now.toLocaleTimeString('en-US'),
  }
}

export function useClock(): Clock {
  const [clock, setClock] = useState(() => formatClock(new Date()))

  useEffect(() => {
    const intervalId = setInterval(() => {
      setClock(formatClock(new Date()))
    }, 1000)

    return () => clearInterval(intervalId)
  }, [])

  return clock
}
