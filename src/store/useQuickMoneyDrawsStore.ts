import { create } from 'zustand'
import { QUICK_MONEY_LOBBY_DRAWS, type QuickMoneyLobbyDraw } from '../data/quickMoneyLobbyMockData'
import { seededDigits } from '../utils/seededRandom'

// Historial de sorteos de Quick Money para el split del lobby principal -- al arrancar se arma con
// los sorteos ya jugados (sync/quickMoneyHistory.ts: seedQuickMoneyDraws, igual en todas las
// máquinas), completado hasta QUICK_MONEY_MAX_DRAWS, y crece con cada sorteo que juega el ciclo
// (useQuickMoneyLobbyCycle). Hasta el primer /gameInfo muestra el mock de quickMoneyLobbyMockData.ts.
// Se reemplaza por datos reales cuando se conecte /api/lottery/last-results.
//
// Lo leen Last Winning (QuickMoneySplitOverlay) y el resumen del sorteo (DrawSummaryHost); la tabla
// Winning Numbers ya no sale de acá sino de useQuickMoneyResultTablesStore (sorteos de hoy y de ayer).
export const QUICK_MONEY_MAX_DRAWS = 10

const DEFAULT_STEP_MS = 5 * 60_000

// Completa la tabla hacia atrás hasta QUICK_MONEY_MAX_DRAWS, continuando el mismo gameNumber (uno
// menos cada vez) y el mismo espaciado de horas que sus dos últimos sorteos. Números con semilla en el
// gameNumber (no Math.random): mismas filas en todas las máquinas.
function fillDraws(source: QuickMoneyLobbyDraw[]): QuickMoneyLobbyDraw[] {
  const draws = source.slice(0, QUICK_MONEY_MAX_DRAWS)
  const [newest, second] = draws
  const stepMs = newest && second ? new Date(newest.drawnAt).getTime() - new Date(second.drawnAt).getTime() : DEFAULT_STEP_MS
  while (draws.length > 0 && draws.length < QUICK_MONEY_MAX_DRAWS) {
    const oldest = draws[draws.length - 1]
    const gameNumber = String((Number(oldest.gameNumber) + 9999) % 10000).padStart(4, '0')
    draws.push({
      gameNumber,
      drawnAt: new Date(new Date(oldest.drawnAt).getTime() - stepMs).toISOString(),
      pick3Result: seededDigits(`quickMoney:${gameNumber}:pick3`, 3),
      pick4Result: seededDigits(`quickMoney:${gameNumber}:pick4`, 4),
    })
  }
  return draws
}

interface QuickMoneyDrawsState {
  draws: QuickMoneyLobbyDraw[]
  addDraw: (draw: QuickMoneyLobbyDraw) => void
  setDraws: (draws: QuickMoneyLobbyDraw[]) => void
}

export const useQuickMoneyDrawsStore = create<QuickMoneyDrawsState>((set) => ({
  draws: fillDraws(QUICK_MONEY_LOBBY_DRAWS),
  addDraw: (draw) => set((state) => ({ draws: [draw, ...state.draws].slice(0, QUICK_MONEY_MAX_DRAWS) })),
  setDraws: (draws) => set({ draws: fillDraws(draws) }),
}))
