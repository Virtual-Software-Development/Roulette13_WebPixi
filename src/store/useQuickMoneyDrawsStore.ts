import { create } from 'zustand'
import { QUICK_MONEY_LOBBY_DRAWS, type QuickMoneyLobbyDraw } from '../data/quickMoneyLobbyMockData'

// Historial de sorteos de Quick Money para el split del lobby principal -- arranca con el mock de
// quickMoneyLobbyMockData.ts completado hasta MAX_DRAWS y crece con cada sorteo mock que juega el
// ciclo (useQuickMoneyLobbyCycle). Se reemplaza por datos reales cuando se conecte
// /api/lottery/last-results.
//
// MAX_DRAWS = filas de la tabla Winning Numbers (QuickMoneySplitOverlay, WINNING_NUMBERS_ROWS).
const MAX_DRAWS = 10

function randomDigits(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 10))
}

// El mock trae solo 5 sorteos -- los que faltan para llenar la tabla desde el arranque se generan
// hacia atrás, continuando el mismo gameNumber (uno menos cada vez) y el mismo espaciado de horas
// que el propio mock (diferencia entre sus dos últimos sorteos).
function seedDraws(): QuickMoneyLobbyDraw[] {
  const draws = [...QUICK_MONEY_LOBBY_DRAWS]
  const [newest, second] = draws
  const stepMs = newest && second ? new Date(newest.drawnAt).getTime() - new Date(second.drawnAt).getTime() : 6 * 60_000
  while (draws.length > 0 && draws.length < MAX_DRAWS) {
    const oldest = draws[draws.length - 1]
    draws.push({
      gameNumber: String((Number(oldest.gameNumber) + 9999) % 10000).padStart(4, '0'),
      drawnAt: new Date(new Date(oldest.drawnAt).getTime() - stepMs).toISOString(),
      pick3Result: randomDigits(3),
      pick4Result: randomDigits(4),
    })
  }
  return draws
}

interface QuickMoneyDrawsState {
  draws: QuickMoneyLobbyDraw[]
  addDraw: (draw: QuickMoneyLobbyDraw) => void
}

export const useQuickMoneyDrawsStore = create<QuickMoneyDrawsState>((set) => ({
  draws: seedDraws(),
  addDraw: (draw) => set((state) => ({ draws: [draw, ...state.draws].slice(0, MAX_DRAWS) })),
}))
