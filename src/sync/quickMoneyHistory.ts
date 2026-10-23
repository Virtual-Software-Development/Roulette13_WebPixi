import { fetchQuickMoneyRoundHistory, type QuickMoneyRoundHistoryEntry } from '../api/roundHistory'
import type { QuickMoneyLobbyDraw } from '../data/quickMoneyLobbyMockData'
import { useQuickMoneyDrawsStore, QUICK_MONEY_MAX_DRAWS } from '../store/useQuickMoneyDrawsStore'
import { QUICK_MONEY_RESULT_OFFSET_MS } from './lobbyTimeline'

// Tabla Winning Numbers del lobby compartido: los sorteos REALES de Quick Money ya liquidados
// (GET /lottery/last-results), los mismos en todas las máquinas. Cada sorteo entra recién cuando las
// demás máquinas ya lo publicaron (al terminar su video, QUICK_MONEY_RESULT_OFFSET_MS después de su
// hora), así una máquina que arranca tarde no adelanta un resultado que las otras todavía muestran.

function toDigits(value: string): number[] {
  return Array.from(value, Number)
}

// Más nuevo primero (como llegan del backend).
export function buildQuickMoneyDraws(entries: QuickMoneyRoundHistoryEntry[], nowMs: number): QuickMoneyLobbyDraw[] {
  const draws: QuickMoneyLobbyDraw[] = []
  for (const entry of entries) {
    if (!entry.pick3 || !entry.pick4) continue
    const drawAtMs = new Date(entry.horaProgramada).getTime()
    if (nowMs < drawAtMs + QUICK_MONEY_RESULT_OFFSET_MS) continue
    draws.push({
      gameNumber: entry.numeroEvento,
      drawnAt: new Date(drawAtMs).toISOString(),
      pick3Result: toDigits(entry.pick3),
      pick4Result: toDigits(entry.pick4),
    })
    if (draws.length === QUICK_MONEY_MAX_DRAWS) break
  }
  return draws
}

// Hora del último sorteo ya jugado según el arranque (publicado o no): en modo 'rotation' es como
// una máquina que arranca durante el video o el resultado de ese sorteo sabe que le toca mostrarlo
// (useLobbyRotationCycle). null = ninguno o todavía sin leer.
let latestSettledDrawAtMs: number | null = null

export function latestSettledQuickMoneyDrawAtMs(): number | null {
  return latestSettledDrawAtMs
}

// Al arrancar el lobby.
export async function seedQuickMoneyDraws(nowMs: number): Promise<void> {
  const entries = await fetchQuickMoneyRoundHistory().catch((err) => {
    console.error('[quickMoneyHistory] no se pudo leer el historial de Quick Money', err)
    return []
  })
  if (entries[0]) latestSettledDrawAtMs = new Date(entries[0].horaProgramada).getTime()
  const draws = buildQuickMoneyDraws(entries, nowMs)
  if (draws.length > 0) useQuickMoneyDrawsStore.getState().setDraws(draws)
}
