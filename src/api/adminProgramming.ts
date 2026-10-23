import { adminFetch, readAdminJson as readJson } from './adminSession'
import type { Programming, ProgrammingSaveResult, ProgrammingView } from '../types/adminProgramming'

// Programming page (admin only): when each game is drawn, its cutoffs and how many days ahead its
// rounds are created (quick-money-backend internal/events/programming.go).

export async function fetchProgramming(): Promise<ProgrammingView> {
  return readJson(await adminFetch('/programming'), 'Load programming')
}

// What saving programming would do, without saving it. Rejects with the backend's message when the
// values are invalid (times too close, a cutoff out of range...).
export async function previewProgramming(programming: Programming, signal?: AbortSignal): Promise<ProgrammingView> {
  const res = await adminFetch('/programming/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(programming),
    signal,
  })
  return readJson(res, 'Preview programming')
}

// Saves programming; the backend creates, updates and cancels rounds right away. Rejects (409) if it
// would remove rounds that already sold tickets.
export async function saveProgramming(programming: Programming): Promise<ProgrammingSaveResult> {
  const res = await adminFetch('/programming', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(programming),
  })
  return readJson(res, 'Save programming')
}
