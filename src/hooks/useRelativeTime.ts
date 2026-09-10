import { useTranslation } from 'react-i18next'
import { ensureClockTicking, useClockStore } from '../store/useClockStore'

// "NOW" / "Xm ago" / "Xh ago" para las filas de GameList -- mismo reloj compartido que
// useCountdown (ensureClockTicking/useClockStore), así no se suma un setInterval propio por fila.
// Selecciona los minutos transcurridos (no el epoch crudo) para que zustand solo re-renderice
// cada fila cuando SU minuto realmente cambia, no en cada tick de 200ms del reloj.
export function useRelativeTime(timestampMs: number): string {
  const { t } = useTranslation()
  ensureClockTicking()
  const elapsedMinutes = useClockStore((state) => Math.max(0, Math.floor((state.now - timestampMs) / 60_000)))

  if (elapsedMinutes < 1) return t('gameList.now')
  if (elapsedMinutes < 60) return t('gameList.minutesAgo', { count: elapsedMinutes })
  return t('gameList.hoursAgo', { count: Math.floor(elapsedMinutes / 60) })
}
