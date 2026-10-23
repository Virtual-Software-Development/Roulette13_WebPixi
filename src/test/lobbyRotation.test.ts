import { describe, expect, it } from 'vitest'
import {
  QUICK_MONEY_FORCED_TAIL_MS,
  ROULETTE_FORCED_TAIL_MS,
  lobbyViewAt,
  rotationQuickMoneySummaryWindow,
  rotationRouletteSummaryWindow,
  rotationViewAt,
  type LobbyDrawTimes,
} from '../sync/lobbyRotation'
import { DRAW_SUMMARY_MIN_MS, QUICK_MONEY_RESULT_OFFSET_MS, RESULT_HOLD_END_OFFSET_MS } from '../sync/lobbyTimeline'
import { formatCountdown } from '../hooks/useCountdown'

const MIN = 60_000
// 2026-10-23 11:00 en Santo Domingo (UTC-4) = 15:00 UTC; un ciclo de rotación arranca acá.
const T = Date.UTC(2026, 9, 23, 15, 0)
const NO_DRAWS: LobbyDrawTimes = { nextRouletteDrawMs: null, lastRouletteDrawMs: null, nextQuickMoneyDrawMs: null, lastQuickMoneyDrawMs: null }

describe('rotationViewAt', () => {
  it('rotates Roulette 2:00 -> Quick Money 7:00 -> Jackpot 1:00 every 10 minutes', () => {
    expect(rotationViewAt(T)).toBe('roulette')
    expect(rotationViewAt(T + 2 * MIN - 1)).toBe('roulette')
    expect(rotationViewAt(T + 2 * MIN)).toBe('quickMoney')
    expect(rotationViewAt(T + 9 * MIN - 1)).toBe('quickMoney')
    expect(rotationViewAt(T + 9 * MIN)).toBe('jackpot')
    expect(rotationViewAt(T + 10 * MIN - 1)).toBe('jackpot')
    expect(rotationViewAt(T + 10 * MIN)).toBe('roulette')
  })
})

describe('lobbyViewAt', () => {
  it('follows the rotation with no draw near', () => {
    expect(lobbyViewAt(T + 9 * MIN, { ...NO_DRAWS, nextRouletteDrawMs: T + 2 * 60 * MIN })).toEqual({ view: 'jackpot', forced: null })
  })

  it('fixes Roulette from 4:00 before the spin until its sequence ends', () => {
    // Giro de las 13:00: la rotación a las 12:56 diría Quick Money.
    const spin = T + 2 * 60 * MIN
    const draws = { ...NO_DRAWS, nextRouletteDrawMs: spin }
    expect(lobbyViewAt(spin - 4 * MIN - 1, draws).forced).toBe(null)
    expect(lobbyViewAt(spin - 4 * MIN, draws)).toEqual({ view: 'roulette', forced: 'roulette' })
    // Ya jugado: lo mantiene su secuencia (video, Winner, resumen), aunque el backend ya anuncie el siguiente.
    const after = { ...NO_DRAWS, nextRouletteDrawMs: spin + 2 * 60 * MIN, lastRouletteDrawMs: spin }
    expect(lobbyViewAt(spin + ROULETTE_FORCED_TAIL_MS - 1, after).forced).toBe('roulette')
    expect(lobbyViewAt(spin + ROULETTE_FORCED_TAIL_MS, after).forced).toBe(null)
  })

  it('fixes Quick Money from 7:00 before its draw through its video and result', () => {
    const draw = T + 60 * MIN // 12:00
    const draws = { ...NO_DRAWS, nextQuickMoneyDrawMs: draw }
    expect(lobbyViewAt(draw - 7 * MIN - 1, draws).forced).toBe(null)
    expect(lobbyViewAt(draw - 7 * MIN, draws)).toEqual({ view: 'quickMoney', forced: 'quickMoney' })
    // Pasada la hora y sin el siguiente anunciado: se está jugando.
    expect(lobbyViewAt(draw + 5_000, draws).forced).toBe('quickMoney')
    const after = { ...NO_DRAWS, nextQuickMoneyDrawMs: draw + 2 * 60 * MIN, lastQuickMoneyDrawMs: draw }
    expect(QUICK_MONEY_FORCED_TAIL_MS).toBeGreaterThan(QUICK_MONEY_RESULT_OFFSET_MS)
    expect(lobbyViewAt(draw + QUICK_MONEY_FORCED_TAIL_MS - 1, after).forced).toBe('quickMoney')
    expect(lobbyViewAt(draw + QUICK_MONEY_FORCED_TAIL_MS, after).forced).toBe(null)
  })

  it('gives Quick Money priority when both are fixed', () => {
    const at = T + 60 * MIN
    expect(lobbyViewAt(at - MIN, { ...NO_DRAWS, nextRouletteDrawMs: at, nextQuickMoneyDrawMs: at })).toEqual({
      view: 'quickMoney',
      forced: 'quickMoney',
    })
  })

  it('never fixes both with the new schedule (Roulette odd hours from 7, Quick Money 12/14/18/20/22)', () => {
    const day = Date.UTC(2026, 9, 23, 4, 0) // 00:00 en Santo Domingo
    const hour = (h: number) => day + h * 60 * MIN
    const roulette = [7, 9, 11, 13, 15, 17, 19, 21, 23].map(hour)
    const quickMoney = [12, 14, 18, 20, 22].map(hour)
    const next = (list: number[], now: number) => list.find((ms) => ms + 1 > now) ?? null
    const last = (list: number[], now: number) => [...list].reverse().find((ms) => ms <= now) ?? null
    for (let now = hour(6); now < hour(24); now += 15_000) {
      const r = lobbyViewAt(now, { ...NO_DRAWS, nextRouletteDrawMs: next(roulette, now), lastRouletteDrawMs: last(roulette, now) })
      const q = lobbyViewAt(now, { ...NO_DRAWS, nextQuickMoneyDrawMs: next(quickMoney, now), lastQuickMoneyDrawMs: last(quickMoney, now) })
      expect(r.forced === 'roulette' && q.forced === 'quickMoney').toBe(false)
    }
  })
})

describe('rotation summary windows', () => {
  it('fit inside the time each view stays fixed', () => {
    const r = rotationRouletteSummaryWindow(T)
    expect(r.startMs).toBe(T + RESULT_HOLD_END_OFFSET_MS)
    expect(r.endMs).toBeLessThan(T + ROULETTE_FORCED_TAIL_MS)
    expect(r.endMs - r.startMs).toBeGreaterThanOrEqual(DRAW_SUMMARY_MIN_MS)
    const q = rotationQuickMoneySummaryWindow(T)
    expect(q.endMs).toBeLessThan(T + QUICK_MONEY_FORCED_TAIL_MS)
    expect(q.endMs - q.startMs).toBeGreaterThanOrEqual(DRAW_SUMMARY_MIN_MS)
  })
})

describe('formatCountdown', () => {
  it('shows hours only from one hour on', () => {
    expect(formatCountdown(59 * 60 + 59)).toBe('59:59')
    expect(formatCountdown(3600)).toBe('1:00:00')
    expect(formatCountdown(2 * 3600 + 5 * 60 + 7)).toBe('2:05:07')
  })
})
