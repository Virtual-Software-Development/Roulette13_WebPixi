import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { onQuickMoneyDrawPublished, serverDayKey, startQuickMoneyResultTables } from '../sync/quickMoneyResultTables'
import { resultsPanelViewAt, RESULTS_PANEL_PAYTABLE_MS, RESULTS_PANEL_WINNING_MS } from '../config/quickMoneyLobbyCycle'
import { useQuickMoneyResultTablesStore } from '../store/useQuickMoneyResultTablesStore'
import { QUICK_MONEY_RESULT_OFFSET_MS } from '../sync/lobbyTimeline'

const INITIAL_STATE = useQuickMoneyResultTablesStore.getState()

describe('serverDayKey', () => {
  it('uses Santo Domingo time (UTC-4)', () => {
    expect(serverDayKey(Date.UTC(2026, 9, 22, 3, 59))).toBe('2026-10-21')
    expect(serverDayKey(Date.UTC(2026, 9, 22, 4, 0))).toBe('2026-10-22')
  })

  it('crosses months and years', () => {
    expect(serverDayKey(Date.UTC(2027, 0, 1, 3, 59))).toBe('2026-12-31')
    expect(serverDayKey(Date.UTC(2027, 0, 1, 4, 0))).toBe('2027-01-01')
  })
})

describe('resultsPanelViewAt', () => {
  const cycle = RESULTS_PANEL_WINNING_MS + RESULTS_PANEL_PAYTABLE_MS

  it('shows Winning Numbers for 15s, then Fast Payments for 10s', () => {
    expect(RESULTS_PANEL_WINNING_MS).toBe(15_000)
    expect(RESULTS_PANEL_PAYTABLE_MS).toBe(10_000)
    const t0 = cycle * 1_000_000
    expect(resultsPanelViewAt(t0)).toBe('winning')
    expect(resultsPanelViewAt(t0 + 14_999)).toBe('winning')
    expect(resultsPanelViewAt(t0 + 15_000)).toBe('paytable')
    expect(resultsPanelViewAt(t0 + 24_999)).toBe('paytable')
    expect(resultsPanelViewAt(t0 + 25_000)).toBe('winning')
  })
})

describe('quickMoneyResultTables loading', () => {
  const NOW = Date.UTC(2026, 9, 22, 20, 0) // 16:00 en Santo Domingo
  const drawAt = (msAgo: number) => new Date(NOW - msAgo).toISOString()
  let fetchMock: ReturnType<typeof vi.fn>
  let stop: () => void

  function respond(routes: Record<string, unknown>) {
    fetchMock.mockImplementation(async (url: string) => {
      const body = routes[url]
      if (body === undefined) return { ok: false, status: 503, json: async () => ({}) }
      return { ok: true, status: 200, json: async () => body }
    })
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    useQuickMoneyResultTablesStore.setState(INITIAL_STATE, true)
  })

  afterEach(() => {
    stop?.()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('loads the three tables, hiding a draw other machines have not published yet', async () => {
    respond({
      '/api/lottery/results/today': [
        { numeroEvento: '0003', fecha: '2026-10-22', horaProgramada: drawAt(10_000), pick3: '123', pick4: '4567' },
        { numeroEvento: '0002', fecha: '2026-10-22', horaProgramada: drawAt(QUICK_MONEY_RESULT_OFFSET_MS + 60_000), pick3: '111', pick4: '2222' },
      ],
      '/api/lottery/results/previous-day': [],
      '/api/lottery/paytable': [{ nombre: '1st', pago: 56 }],
    })
    stop = startQuickMoneyResultTables()
    await vi.advanceTimersByTimeAsync(0)

    const state = useQuickMoneyResultTablesStore.getState()
    expect(state.today.status).toBe('ready')
    expect(state.today.draws.map((d) => d.gameNumber)).toEqual(['0002'])
    expect(state.yesterday).toMatchObject({ status: 'ready', draws: [] })
    expect(state.paytable.rows).toEqual([{ nombre: '1st', pago: 56 }])
  })

  it('retries a failed table every minute, but not an empty one', async () => {
    respond({ '/api/lottery/results/today': [], '/api/lottery/paytable': [] })
    stop = startQuickMoneyResultTables()
    await vi.advanceTimersByTimeAsync(0)
    expect(useQuickMoneyResultTablesStore.getState().yesterday.status).toBe('error')
    expect(fetchMock).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(59_000)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/lottery/results/today',
      '/api/lottery/results/previous-day',
      '/api/lottery/paytable',
      '/api/lottery/results/previous-day',
    ])
  })

  it('reloads everything when the server day changes', async () => {
    respond({ '/api/lottery/results/today': [], '/api/lottery/results/previous-day': [], '/api/lottery/paytable': [] })
    vi.setSystemTime(Date.UTC(2027, 0, 1, 3, 59, 50)) // 23:59:50 del 31/12 en Santo Domingo
    stop = startQuickMoneyResultTables()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })

  it('shows a published draw right away and reloads the tables', async () => {
    respond({ '/api/lottery/results/today': [], '/api/lottery/results/previous-day': [], '/api/lottery/paytable': [] })
    stop = startQuickMoneyResultTables()
    await vi.advanceTimersByTimeAsync(0)

    fetchMock.mockImplementation(() => new Promise(() => {}))
    onQuickMoneyDrawPublished({ gameNumber: '0004', drawnAt: drawAt(80_000), pick3Result: [1, 2, 3], pick4Result: [4, 5, 6, 7] })
    expect(useQuickMoneyResultTablesStore.getState().today.draws.map((d) => d.gameNumber)).toEqual(['0004'])
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })
})
