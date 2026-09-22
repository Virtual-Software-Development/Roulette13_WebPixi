import type { DayOfWeek } from '../types/rtpManagement'

// Shared by RtpProfileForm.tsx (building a profile right after Save) and RtpManagementPage.tsx
// (mapping GET /rtp-profiles rows into the same display shape) -- one place computing "how a
// profile's schedule/dates look", so a freshly-created profile and one loaded from the database
// are formatted identically.

const DATE_DISPLAY_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const DATETIME_DISPLAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

// yyyy-mm-dd -> "Sep 22, 2026". timeZone:'UTC' explicit (paired with the T00:00:00Z below) so the
// displayed day never shifts by the viewer's local offset.
export function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return ''
  return DATE_DISPLAY_FORMATTER.format(new Date(`${isoDate}T00:00:00Z`))
}

// Full ISO timestamp (createdAt/updatedAt from the API) -> "Sep 22, 2026 13:42".
export function formatDateTimeDisplay(isoDateTime: string): string {
  if (!isoDateTime) return ''
  return DATETIME_DISPLAY_FORMATTER.format(new Date(isoDateTime))
}

// Same logic RtpProfileForm.tsx already used inline for the just-created profile -- extracted so
// profiles loaded from GET /rtp-profiles get the identical string instead of re-deriving it
// differently.
export function buildScheduleSummary(
  activeDays: DayOfWeek[],
  restrictHours: boolean,
  startTime: string,
  endTime: string,
  translateDay: (day: DayOfWeek) => string,
): string {
  const dayLabel = activeDays.length === 7 ? 'Daily' : activeDays.map(translateDay).join(', ')
  return restrictHours ? `${dayLabel} · ${startTime}-${endTime}` : dayLabel
}
