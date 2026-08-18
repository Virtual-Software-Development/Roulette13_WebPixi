import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface Clock {
  date: string
  time: string
}

function formatClock(now: Date, locale: string): Clock {
  return {
    date: now.toLocaleDateString(locale),
    time: now.toLocaleTimeString(locale),
  }
}

export function useClock(): Clock {
  const { i18n } = useTranslation()
  const [clock, setClock] = useState(() => formatClock(new Date(), i18n.language))

  useEffect(() => {
    function updateClock() {
      setClock(formatClock(new Date(), i18n.language))
    }

    updateClock()
    const intervalId = setInterval(updateClock, 1000)

    return () => clearInterval(intervalId)
  }, [i18n.language])

  return clock
}
