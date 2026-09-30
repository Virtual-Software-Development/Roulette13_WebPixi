import { create } from 'zustand'
import { QUICK_MONEY_LOBBY_DRAWS } from '../data/quickMoneyLobbyMockData'

// Ciclo de ronda de Quick Money -- 100% local/mock, mismo criterio que ya usa
// components/admin/nextResults/PickResultPanel.tsx (sin backend real de rondas para este juego,
// a diferencia de Roulette que sí tiene GameInfoResponse.nextDraw). Pick 3 y Pick 4 COMPARTEN un
// único draw cycle (pedido explícito, ver conversación: un solo sorteo produce ambos resultados a
// la vez, mismo drawNumber/nextDrawTime para los dos juegos -- no dos relojes independientes como
// antes). Consumido por RoundCountdownRow.tsx (Betting Workspace, una badge por gameType pero las
// dos leen el mismo countdown/drawNumber) y por QuickMoneyDrawCountdown.tsx (Quick Money Lobby,
// panel central único). Puramente informativo en v1: nada lee este countdown para bloquear Add to
// Bet Slip/Place Bet.
//
// En el lobby principal (App.tsx) este reloj NO manda: useQuickMoneyLobbyCycle agenda el sorteo de
// Quick Money dentro del bloque de cada round de Roulette y pisa nextDrawTime (ver
// config/quickMoneyLobbyCycle.ts). Este intervalo solo rige en las vistas de Quick Money sueltas.
const ROUND_DURATION_SECONDS = 45

// Consecutivo a partir del último sorteo del mock (quickMoneyLobbyMockData.ts), así la tabla de
// Winning Numbers del lobby compartido sigue una numeración coherente (antes era aleatorio).
function nextDrawNumber(previous: string): string {
  return String((Number(previous) + 1) % 10000).padStart(4, '0')
}

function nextDrawIso(): string {
  return new Date(Date.now() + ROUND_DURATION_SECONDS * 1000).toISOString()
}

interface QuickMoneyRoundState {
  nextDrawTime: string
  drawNumber: string
  // Se llama cuando el countdown compartido llega a 0 -- genera el próximo drawNumber y
  // reprograma el próximo sorteo, mismo loop infinito que un reloj real de sorteos periódicos,
  // sin depender de nada externo.
  advanceRound: () => void
}

export const useQuickMoneyRoundStore = create<QuickMoneyRoundState>((set) => ({
  nextDrawTime: nextDrawIso(),
  drawNumber: nextDrawNumber(QUICK_MONEY_LOBBY_DRAWS[0].gameNumber),

  advanceRound: () => set((state) => ({ nextDrawTime: nextDrawIso(), drawNumber: nextDrawNumber(state.drawNumber) })),
}))
