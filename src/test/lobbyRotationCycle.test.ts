import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { CurrentEvent } from '../api/terminalTicket'

// El ciclo del lobby en modo 'rotation' (hooks/useLobbyRotationCycle.ts) contra el comportamiento
// real del backend: anuncia el sorteo siguiente unos segundos ANTES de jugar el actual.

let applyEvent: (event: CurrentEvent | null) => void = () => {}
vi.mock('../hooks/useQuickMoneyEventSync', () => ({
  useQuickMoneyEventSync: (apply: (event: CurrentEvent | null) => void) => {
    applyEvent = apply
  },
}))
vi.mock('../video/quickMoneyDrawVideo', () => ({
  prepareQuickMoneyDraw: vi.fn(),
  takePreparedDraw: vi.fn(() => ({ status: 'ready', draw: { drawNumber: '0007', pick3: [1, 2, 3], pick4: [4, 5, 6, 7] } })),
}))
vi.mock('../api/quickMoneyLobbyDraw', () => ({ fetchQuickMoneyLobbyDraw: vi.fn(async () => null) }))
vi.mock('../sync/quickMoneyResultTables', () => ({ onQuickMoneyDrawPublished: vi.fn() }))

const MIN = 60_000
// 11:05 en Santo Domingo: en la rotación toca Quick Money (minuto 5 del ciclo de 10).
const NOW = Date.UTC(2026, 9, 23, 15, 5)
const iso = (ms: number) => new Date(ms).toISOString()

function event(id: number, number: string, drawAtMs: number, closeBeforeMs: number): CurrentEvent {
  return {
    id,
    juego: 'lottery',
    numeroEvento: number,
    horaProgramada: iso(drawAtMs),
    horaCierreApuestas: iso(drawAtMs - closeBeforeMs),
    estado: 'sugerido',
  }
}

async function setup() {
  vi.resetModules()
  const cycle = await import('../hooks/useLobbyRotationCycle')
  const { useLobbyModeStore } = await import('../store/useLobbyModeStore')
  const { useGameConfigStore } = await import('../store/useGameConfigStore')
  const { useQuickMoneyRoundStore } = await import('../store/useQuickMoneyRoundStore')
  renderHook(() => cycle.useLobbyRotationCycle())
  return { lobby: useLobbyModeStore, config: useGameConfigStore, round: useQuickMoneyRoundStore }
}

describe('useLobbyRotationCycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('follows the rotation, then fixes Roulette for its anteroom even after the backend announces the next spin', async () => {
    const { lobby, config } = await setup()
    config.setState({ nextDrawStartTime: iso(NOW + 2 * 60 * MIN) })
    applyEvent(null)
    await vi.advanceTimersByTimeAsync(300)
    expect(lobby.getState().phase).toBe('quickMoneySplit')
    expect(lobby.getState().forced).toBe(null)

    // Giro en 3:00: antesala.
    const spin = NOW + 3 * MIN
    config.setState({ nextDrawStartTime: iso(spin) })
    await vi.advanceTimersByTimeAsync(300)
    expect(lobby.getState().phase).toBe('roulette')
    expect(lobby.getState().forced).toBe('roulette')

    // 2s antes del giro el backend ya anuncia el siguiente: la vista sigue fija.
    await vi.advanceTimersByTimeAsync(spin - 2_000 - Date.now())
    config.setState({ nextDrawStartTime: iso(spin + 2 * 60 * MIN) })
    await vi.advanceTimersByTimeAsync(4_000)
    expect(lobby.getState().forced).toBe('roulette')
  })

  it('keeps showing the Quick Money draw of its anteroom and plays it, even after the backend opened the next one', async () => {
    const { lobby, config, round } = await setup()
    config.setState({ nextDrawStartTime: iso(NOW + 2 * 60 * MIN) })
    const draw = NOW + 5 * MIN
    applyEvent(event(10, '0007', draw, 6 * MIN))
    await vi.advanceTimersByTimeAsync(300)
    expect(lobby.getState()).toMatchObject({ phase: 'quickMoneySplit', forced: 'quickMoney' })
    expect(round.getState()).toMatchObject({ eventId: 10, drawNumber: '0007' })

    // 2s antes del sorteo el backend ya tiene abierto el siguiente.
    await vi.advanceTimersByTimeAsync(draw - 2_000 - Date.now())
    applyEvent(event(11, '0008', draw + 2 * 60 * MIN, 6 * MIN))
    await vi.advanceTimersByTimeAsync(300)
    expect(round.getState()).toMatchObject({ eventId: 10, drawNumber: '0007' })
    expect(lobby.getState().forced).toBe('quickMoney')

    // A la hora del sorteo: video con sus números, y el panel pasa al sorteo siguiente.
    await vi.advanceTimersByTimeAsync(2_000)
    expect(lobby.getState().phase).toBe('quickMoneyVideo')
    expect(lobby.getState().pendingDraw).toMatchObject({ gameNumber: '0007', pick3Result: [1, 2, 3] })
    expect(round.getState()).toMatchObject({ eventId: 11, drawNumber: '0008' })
    expect(lobby.getState().forced).toBe('quickMoney')
  })

  it('shows the Jackpot view in its slot of the rotation', async () => {
    vi.setSystemTime(NOW + 4 * MIN) // minuto 9 del ciclo
    const { lobby, config } = await setup()
    config.setState({ nextDrawStartTime: iso(NOW + 2 * 60 * MIN) })
    applyEvent(null)
    await vi.advanceTimersByTimeAsync(300)
    expect(lobby.getState()).toMatchObject({ phase: 'jackpot', forced: null })
  })
})
