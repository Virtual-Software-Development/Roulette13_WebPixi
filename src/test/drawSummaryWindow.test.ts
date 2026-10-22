import { describe, expect, it } from 'vitest'
import {
  DRAW_SUMMARY_EXIT_MARGIN_MS,
  QUICK_MONEY_VIDEO_END_OFFSET_MS,
  RESULT_HOLD_END_OFFSET_MS,
  quickMoneyDrawAtMs,
  quickMoneySummaryWindow,
  rouletteSummaryWindow,
} from '../sync/lobbyTimeline'
import { QUICK_MONEY_BLOCK_ENTER_AT_REMAINING_MS, QUICK_MONEY_BLOCK_EXIT_AT_REMAINING_MS } from '../config/quickMoneyLobbyCycle'

const ROUND_MS = 300_000

describe('draw summary windows (round of 5:00)', () => {
  it('Roulette: from the end of the Winner hold (before the lobby returns) until just before the Quick Money block enters', () => {
    const window = rouletteSummaryWindow(0, ROUND_MS)!
    expect(window.startMs).toBe(RESULT_HOLD_END_OFFSET_MS)
    expect(window.endMs).toBe(ROUND_MS - QUICK_MONEY_BLOCK_ENTER_AT_REMAINING_MS - DRAW_SUMMARY_EXIT_MARGIN_MS)
    // ~42 s: entra completo en el hueco "Roulette a pantalla completa" de 0:25 a 1:10.
    expect(window.endMs - window.startMs).toBeGreaterThan(40_000)
  })

  it('Quick Money: from the end of its video (before the split returns) until just before the block exits', () => {
    const qmDraw = quickMoneyDrawAtMs(ROUND_MS)
    const window = quickMoneySummaryWindow(qmDraw, ROUND_MS)!
    expect(window.startMs).toBe(qmDraw + QUICK_MONEY_VIDEO_END_OFFSET_MS)
    expect(window.endMs).toBe(ROUND_MS - QUICK_MONEY_BLOCK_EXIT_AT_REMAINING_MS - DRAW_SUMMARY_EXIT_MARGIN_MS)
    expect(window.endMs - window.startMs).toBeGreaterThan(15_000)
  })

  it('never overlaps the Quick Money block nor the next Roulette draw', () => {
    const roulette = rouletteSummaryWindow(0, ROUND_MS)!
    const quickMoney = quickMoneySummaryWindow(quickMoneyDrawAtMs(ROUND_MS), ROUND_MS)!
    expect(roulette.endMs).toBeLessThan(ROUND_MS - QUICK_MONEY_BLOCK_ENTER_AT_REMAINING_MS)
    expect(quickMoney.startMs).toBeGreaterThan(roulette.endMs)
    expect(quickMoney.endMs).toBeLessThan(ROUND_MS - QUICK_MONEY_BLOCK_EXIT_AT_REMAINING_MS)
  })

  it('is skipped when the gap is too short (a shorter round)', () => {
    // Round de 4:00: el bloque de Quick Money entra 10 s después de volver al lobby.
    expect(rouletteSummaryWindow(0, 240_000)).toBeNull()
  })
})
