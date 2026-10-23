import { beforeEach, describe, expect, it } from 'vitest'
import { applyNextDraw, useQuickMoneyScheduleStore } from '../sync/quickMoneySchedule'
import { formatCountdown } from '../hooks/useCountdown'

const HOUR = 3_600_000
const T12 = Date.UTC(2026, 9, 23, 16, 0, 0) // 12:00 in Santo Domingo
const T14 = T12 + 2 * HOUR

describe('Quick Money schedule for the lobby', () => {
  beforeEach(() => useQuickMoneyScheduleStore.setState({ nextDrawAtMs: null, nextDrawNumber: null, lastDrawAtMs: null }))

  it('follows the next real draw and keeps the one just drawn as the last', () => {
    applyNextDraw({ drawAtMs: T12, drawNumber: '0001' }, T12 - HOUR)
    expect(useQuickMoneyScheduleStore.getState()).toMatchObject({ nextDrawAtMs: T12, nextDrawNumber: '0001', lastDrawAtMs: null })

    // 12:00 was drawn: the backend's next one is 14:00.
    applyNextDraw({ drawAtMs: T14, drawNumber: '0002' }, T12 + 3_000)
    expect(useQuickMoneyScheduleStore.getState()).toMatchObject({ nextDrawAtMs: T14, nextDrawNumber: '0002', lastDrawAtMs: T12 })
  })

  it('does not take a moved or removed future draw as drawn', () => {
    applyNextDraw({ drawAtMs: T12, drawNumber: '0001' }, T12 - HOUR)
    // An admin moved it to 14:00 an hour before: 12:00 never happened.
    applyNextDraw({ drawAtMs: T14, drawNumber: '0001' }, T12 - HOUR)
    expect(useQuickMoneyScheduleStore.getState().lastDrawAtMs).toBeNull()
    // And Quick Money paused: nothing next.
    applyNextDraw(null, T12 - HOUR)
    expect(useQuickMoneyScheduleStore.getState()).toMatchObject({ nextDrawAtMs: null, lastDrawAtMs: null })
  })
})

describe('countdown format', () => {
  it('shows hours once an hour or more is left', () => {
    expect(formatCountdown(59)).toBe('00:59')
    expect(formatCountdown(3599)).toBe('59:59')
    expect(formatCountdown(3600)).toBe('1:00:00')
    expect(formatCountdown(2 * 3600 - 30)).toBe('1:59:30')
    expect(formatCountdown(14 * 3600 + 5 * 60)).toBe('14:05:00')
  })
})
