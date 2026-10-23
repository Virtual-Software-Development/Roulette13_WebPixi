import { ensureClockTicking, useClockStore } from '../store/useClockStore'
import { parseApiDateTime } from '../utils/time'

const URGENT_THRESHOLD_SECONDS = 10

export interface Countdown {
  remainingSeconds: number
  display: string
  urgent: boolean
}

function computeRemainingMs(targetIso: string, now: number): number {
  if (!targetIso) return 0
  return Math.max(0, parseApiDateTime(targetIso).getTime() - now)
}

// MM:SS; desde una hora, H:MM:SS (con el horario nuevo hay horas entre sorteos).
export function formatCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mmss = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return hours > 0 ? `${hours}:${mmss}` : mmss
}

// Fuente del tiempo: useClockStore (un solo timer compartido, ver su comentario) en vez de un
// setInterval propio por cada llamada -- cada consumidor sigue viendo exactamente la misma forma
// {remainingSeconds, display, urgent}, pero ahora solo re-renderiza cuando SU remainingSeconds
// entero realmente cambia (zustand compara por igualdad el valor que devuelve el selector), no en
// cada tick de 200ms del reloj compartido.
export function useCountdown(targetIso: string): Countdown {
  ensureClockTicking()
  const remainingSeconds = useClockStore((state) => Math.ceil(computeRemainingMs(targetIso, state.now) / 1000))

  return {
    remainingSeconds,
    display: formatCountdown(remainingSeconds),
    urgent: remainingSeconds <= URGENT_THRESHOLD_SECONDS,
  }
}
