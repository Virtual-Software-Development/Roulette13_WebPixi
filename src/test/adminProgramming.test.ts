import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchProgramming, previewProgramming, saveProgramming } from '../api/adminProgramming'
import type { Programming } from '../types/adminProgramming'
import { addTime, everyHours, formatDuration, isClock, scheduleClock, scheduleDay, splitSeconds } from '../utils/programmingTime'

const programming: Programming = {
  horizonDays: 7,
  roulette: { dailyTimes: ['00:00', '02:00'], bettingCloseSeconds: 60, resultChangeSeconds: 30, isActive: true },
  quickMoney: { dailyTimes: ['12:00'], bettingCloseSeconds: 360, resultChangeSeconds: 240, isActive: true },
}

describe('programming API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reads, previews and saves through the admin endpoints', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ programming, rounds: [], summary: {} }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchProgramming()
    await previewProgramming(programming)
    await saveProgramming(programming)

    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][]
    expect(calls.map(([url, init]) => `${init?.method ?? 'GET'} ${url}`)).toEqual([
      'GET /api/programming',
      'POST /api/programming/preview',
      'PUT /api/programming',
    ])
    expect(JSON.parse(calls[2][1].body as string)).toEqual(programming)
  })

  it('surfaces the backend message of a refused change', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'this change would remove rounds that already sold tickets: Roulette 2026-10-24 16:00' }), { status: 409 })))
    await expect(saveProgramming(programming)).rejects.toThrow('already sold tickets')
  })
})

describe('programming time helpers', () => {
  it('validates and adds times of the day', () => {
    expect(isClock('00:00')).toBe(true)
    expect(isClock('23:59')).toBe(true)
    expect(isClock('24:00')).toBe(false)
    expect(isClock('9:30')).toBe(false)
    expect(addTime(['12:00', '02:00'].sort(), '08:30')).toEqual(['02:00', '08:30', '12:00'])
    expect(addTime(['12:00'], '12:00')).toEqual(['12:00'])
    expect(addTime(['12:00'], 'nope')).toEqual(['12:00'])
  })

  it('fills every N hours from midnight', () => {
    expect(everyHours(2)).toEqual(['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'])
    expect(everyHours(4)).toHaveLength(6)
  })

  it('formats durations', () => {
    expect(splitSeconds(90)).toEqual({ minutes: 1, seconds: 30 })
    expect(formatDuration(30)).toBe('30 s')
    expect(formatDuration(120)).toBe('2 min')
    expect(formatDuration(90)).toBe('1 min 30 s')
  })

  it('shows instants in Santo Domingo time whatever the browser time zone', () => {
    // 2026-10-24 01:30 UTC is 2026-10-23 21:30 in Santo Domingo.
    expect(scheduleClock('2026-10-24T01:30:00Z')).toBe('21:30')
    expect(scheduleClock('2026-10-24T01:30:15Z', true)).toBe('21:30:15')
    expect(scheduleDay('2026-10-24T01:30:00Z')).toBe('2026-10-23')
    expect(scheduleClock('2026-10-23T16:00:00-04:00')).toBe('16:00')
  })
})
