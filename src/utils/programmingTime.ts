// Helpers of the Programming page: the schedule is in Santo Domingo time (UTC-4, no DST), whatever
// the browser's time zone is.

export const SCHEDULE_TIME_ZONE = 'America/Santo_Domingo'

// 'HH:MM' (24h), 00:00 to 23:59.
export function isClock(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

// Adds time to a list of times: sorted, without repeats. Invalid times are ignored.
export function addTime(times: readonly string[], time: string): string[] {
  if (!isClock(time) || times.includes(time)) return [...times]
  return [...times, time].sort()
}

// Every `hours` hours from midnight: 1 -> 00:00, 01:00 ... 23:00.
export function everyHours(hours: number): string[] {
  const out: string[] = []
  for (let h = 0; h < 24; h += hours) out.push(`${String(h).padStart(2, '0')}:00`)
  return out
}

// Seconds as minutes and seconds, for the duration fields.
export function splitSeconds(total: number): { minutes: number; seconds: number } {
  const safe = Math.max(0, Math.round(total))
  return { minutes: Math.floor(safe / 60), seconds: safe % 60 }
}

// "1 min", "30 s", "1 min 30 s".
export function formatDuration(total: number): string {
  const { minutes, seconds } = splitSeconds(total)
  if (minutes === 0) return `${seconds} s`
  if (seconds === 0) return `${minutes} min`
  return `${minutes} min ${seconds} s`
}

// The time of day of an instant in Santo Domingo, 'HH:MM' (withSeconds: 'HH:MM:SS').
export function scheduleClock(iso: string, withSeconds = false): string {
  const shifted = new Date(new Date(iso).getTime() - 4 * 3600_000).toISOString()
  return shifted.slice(11, withSeconds ? 19 : 16)
}

// The Santo Domingo calendar day of an instant, 'YYYY-MM-DD' (to group rounds by day).
export function scheduleDay(iso: string): string {
  return new Date(new Date(iso).getTime() - 4 * 3600_000).toISOString().slice(0, 10)
}
