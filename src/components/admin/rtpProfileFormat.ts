import type { TFunction } from 'i18next'
import { DAYS_OF_WEEK, type DayOfWeek } from '../../types/rtpManagement'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

// yyyy-mm-dd (día de calendario, sin zona) -- se interpreta en UTC para no correrlo un día.
export function formatProfileDate(iso: string): string {
  return iso ? DATE_FORMATTER.format(new Date(`${iso}T00:00:00Z`)) : ''
}

// Timestamp ISO del backend, en hora local del navegador.
export function formatProfileDateTime(iso: string): string {
  return iso ? DATE_TIME_FORMATTER.format(new Date(iso)) : ''
}

// HH:MM:SS -> HH:MM
export function formatProfileTime(time: string | null): string {
  return time ? time.slice(0, 5) : ''
}

interface ProfileHours {
  startTime: string | null
  endTime: string | null
}

function hoursLabel({ startTime, endTime }: ProfileHours): string | null {
  return startTime && endTime ? `${formatProfileTime(startTime)}-${formatProfileTime(endTime)}` : null
}

// Columna SCHEDULE: días activos (o "Daily" si son los 7) + franja horaria si la hay.
export function profileScheduleSummary(activeDays: DayOfWeek[], hours: ProfileHours, t: TFunction): string {
  const days =
    activeDays.length === DAYS_OF_WEEK.length
      ? t('admin.rtp.management.scheduling.daily')
      : activeDays.map((d) => t(`admin.rtp.management.scheduling.form.days.${d}`)).join(', ')
  const hoursText = hoursLabel(hours)
  return hoursText ? `${days} · ${hoursText}` : days
}

// Columna ACTIVE PERIOD de la actividad: rango de fechas del profile + franja horaria si la hay.
export function profileActivePeriod(startDate: string, expiresDate: string, hours: ProfileHours): string {
  const range = `${formatProfileDate(startDate)} → ${formatProfileDate(expiresDate)}`
  const hoursText = hoursLabel(hours)
  return hoursText ? `${range} · ${hoursText}` : range
}
