import { describe, expect, it } from 'vitest'
import {
  DRAW_EXECUTION_LEAD_MS,
  LOBBY_RETURN_OFFSET_MS,
  RESULT_HOLD_END_OFFSET_MS,
  ROULETTE_VIDEO_RESERVED_MS,
  VIDEO_WINDOW_END_OFFSET_MS,
  QUICK_MONEY_RESULT_OFFSET_MS,
  quickMoneyDrawAtMs,
  rotorPhaseMs,
  rouletteDrawPhaseAt,
} from '../sync/lobbyTimeline'
import { offsetFromSamples } from '../time/serverClock'
import { seededDigits } from '../utils/seededRandom'
import { buildQuickMoneyDraws, quickMoneyFallbackDigits } from '../sync/quickMoneyHistory'
import { QUICK_MONEY_VIDEO_BUDGET_MS } from '../config/quickMoneyLobbyCycle'

const T0 = Date.UTC(2026, 9, 14, 15, 0, 0)

describe('lobbyTimeline', () => {
  it('reserves a window longer than the longest roulette clip (20.73s)', () => {
    expect(ROULETTE_VIDEO_RESERVED_MS).toBeGreaterThan(20_730)
  })

  it('places each instant around a draw in the right phase', () => {
    expect(rouletteDrawPhaseAt(T0 - DRAW_EXECUTION_LEAD_MS - 1, T0)).toBe('lobby')
    expect(rouletteDrawPhaseAt(T0 - DRAW_EXECUTION_LEAD_MS, T0)).toBe('video')
    expect(rouletteDrawPhaseAt(T0 + VIDEO_WINDOW_END_OFFSET_MS - 1, T0)).toBe('video')
    expect(rouletteDrawPhaseAt(T0 + VIDEO_WINDOW_END_OFFSET_MS, T0)).toBe('hold')
    expect(rouletteDrawPhaseAt(T0 + RESULT_HOLD_END_OFFSET_MS - 1, T0)).toBe('hold')
    expect(rouletteDrawPhaseAt(T0 + RESULT_HOLD_END_OFFSET_MS, T0)).toBe('exit')
    expect(rouletteDrawPhaseAt(T0 + LOBBY_RETURN_OFFSET_MS - 1, T0)).toBe('exit')
    expect(rouletteDrawPhaseAt(T0 + LOBBY_RETURN_OFFSET_MS, T0)).toBe('lobby')
  })

  it('restarts the rotor from angle 0 when the wheel is released, the same on every machine', () => {
    const release = T0 + RESULT_HOLD_END_OFFSET_MS
    expect(rotorPhaseMs(release, T0, 8000)).toBe(0)
    expect(rotorPhaseMs(release + 8000 * 3 + 1234, T0, 8000)).toBe(1234)
    // Before any known draw the epoch is the shared anchor.
    expect(rotorPhaseMs(16_500, null, 8000)).toBe(500)
  })

  it('fits the whole Quick Money video sequence in its budget', () => {
    expect(QUICK_MONEY_RESULT_OFFSET_MS).toBeLessThanOrEqual(QUICK_MONEY_VIDEO_BUDGET_MS)
  })
})

describe('serverClock offsetFromSamples', () => {
  it('uses the sample with the lowest round trip and its midpoint', () => {
    const offset = offsetFromSamples([
      { sentAt: 1000, receivedAt: 1400, serverTimeMs: 6000 }, // rtt 400
      { sentAt: 2000, receivedAt: 2040, serverTimeMs: 7020 }, // rtt 40 -> server read at local 2020
      { sentAt: 3000, receivedAt: 3300, serverTimeMs: 8100 },
    ])
    expect(offset).toBe(5000)
  })

  it('returns null without samples', () => {
    expect(offsetFromSamples([])).toBeNull()
  })
})

describe('seededDigits', () => {
  it('is deterministic per seed and stays in 0-9', () => {
    const a = seededDigits('quickMoney:0042:pick4', 4)
    expect(seededDigits('quickMoney:0042:pick4', 4)).toEqual(a)
    expect(a).toHaveLength(4)
    a.forEach((d) => expect(d >= 0 && d <= 9).toBe(true))
    expect(seededDigits('quickMoney:0043:pick4', 12)).not.toEqual(seededDigits('quickMoney:0042:pick4', 12))
  })
})

describe('buildQuickMoneyDraws', () => {
  const rounds = [
    { drawNo: '0012', rouletteDrawAtMs: T0 },
    { drawNo: '0011', rouletteDrawAtMs: T0 - 299_000 },
  ]

  it('lists only Quick Money draws already published, numbered by their roulette round', () => {
    // At T0 the Quick Money draw of round 0012 (T0 - 200s) has already finished its video.
    const draws = buildQuickMoneyDraws(rounds, [], T0)
    expect(draws.map((d) => d.gameNumber)).toEqual(['0012', '0011'])
    expect(draws[0].drawnAt).toBe(new Date(quickMoneyDrawAtMs(T0)).toISOString())

    // Right after round 0012's Quick Money draw, its result is not published yet.
    const early = buildQuickMoneyDraws(rounds, [], quickMoneyDrawAtMs(T0) + 1000)
    expect(early.map((d) => d.gameNumber)).toEqual(['0011'])
  })

  it('uses the shared backend job digits when one matches the draw, the seeded ones otherwise', () => {
    const drawAt = quickMoneyDrawAtMs(T0)
    const jobs = [
      { id: 'a', pick3: '123', pick4: '4567', estado: 'listo' as const, drawAt: new Date(drawAt + 3000).toISOString() },
    ]
    const [withJob, withoutJob] = buildQuickMoneyDraws(rounds, jobs, T0)
    expect(withJob.pick3Result).toEqual([1, 2, 3])
    expect(withJob.pick4Result).toEqual([4, 5, 6, 7])
    expect(withoutJob.pick3Result).toEqual(quickMoneyFallbackDigits('0011').pick3)
  })
})
