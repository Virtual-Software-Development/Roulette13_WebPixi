import { describe, expect, it } from 'vitest'
import {
  DRAW_SUMMARY_EXIT_MARGIN_MS,
  QUICK_MONEY_VIDEO_END_OFFSET_MS,
  RESULT_HOLD_END_OFFSET_MS,
  quickMoneyBlockEnterMs,
  quickMoneyBlockExitMs,
  quickMoneySummaryWindow,
  rouletteSummaryWindow,
} from '../sync/lobbyTimeline'
import { QUICK_MONEY_BLOCK_EXIT_AFTER_DRAW_MS, QUICK_MONEY_DRAW_LEAD_MS } from '../config/quickMoneyLobbyCycle'
import { WINNING_TICKETS_DURATION_MS } from '../layout/layout.constants'

const HOUR = 3_600_000

describe('draw summary windows (scheduled rounds)', () => {
  it('Roulette: from the end of the Winner hold, for the summary screen length -- not the whole 2-hour round', () => {
    const window = rouletteSummaryWindow(0, 2 * HOUR)!
    expect(window.startMs).toBe(RESULT_HOLD_END_OFFSET_MS)
    expect(window.endMs).toBe(RESULT_HOLD_END_OFFSET_MS + WINNING_TICKETS_DURATION_MS)
  })

  it('Roulette: ends before a Quick Money block that comes sooner', () => {
    const quickMoneyDraw = RESULT_HOLD_END_OFFSET_MS + 60_000
    const window = rouletteSummaryWindow(0, 2 * HOUR, quickMoneyDraw)!
    expect(window.endMs).toBe(quickMoneyBlockEnterMs(quickMoneyDraw) - DRAW_SUMMARY_EXIT_MARGIN_MS)
    // A Quick Money draw already behind doesn't cut it.
    expect(rouletteSummaryWindow(0, 2 * HOUR, -HOUR)!.endMs).toBe(RESULT_HOLD_END_OFFSET_MS + WINNING_TICKETS_DURATION_MS)
  })

  it('Roulette: skipped when the next phase is too close', () => {
    expect(rouletteSummaryWindow(0, 2 * HOUR, RESULT_HOLD_END_OFFSET_MS + QUICK_MONEY_DRAW_LEAD_MS + 5_000)).toBeNull()
  })

  it('Quick Money: from the end of its video until just before its block exits', () => {
    const draw = 12 * HOUR
    const window = quickMoneySummaryWindow(draw)!
    expect(window.startMs).toBe(draw + QUICK_MONEY_VIDEO_END_OFFSET_MS)
    expect(window.endMs).toBe(draw + QUICK_MONEY_BLOCK_EXIT_AFTER_DRAW_MS - DRAW_SUMMARY_EXIT_MARGIN_MS)
    expect(window.endMs - window.startMs).toBeGreaterThan(15_000)
    expect(window.endMs).toBeLessThan(quickMoneyBlockExitMs(draw))
  })
})
