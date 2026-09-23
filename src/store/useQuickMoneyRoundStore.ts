import { create } from 'zustand'
import type { QuickMoneyGameType } from '../types/quickMoneyBet'

// Ciclo de ronda de Quick Money -- 100% local/mock, mismo criterio que ya usa
// components/admin/nextResults/PickResultPanel.tsx (sin backend real de rondas para este juego,
// a diferencia de Roulette que sí tiene GameInfoResponse.nextDraw). Pick 3 y Pick 4 corren ciclos
// INDEPENDIENTES (duración propia, drawNumber propio) -- reflejan sorteos separados, no un solo
// reloj compartido como el de Roulette (useGameConfigStore.nextDrawStartTime). Puramente
// informativo en v1 (ver plan): nada lee este countdown para bloquear Add to Bet Slip/Place Bet.
const ROUND_DURATION_SECONDS: Record<QuickMoneyGameType, number> = {
  pick3: 45,
  pick4: 60,
}

function randomDrawNumber(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0')
}

function nextDrawIso(gameType: QuickMoneyGameType): string {
  return new Date(Date.now() + ROUND_DURATION_SECONDS[gameType] * 1000).toISOString()
}

interface RoundInfo {
  nextDrawTime: string
  drawNumber: string
}

interface QuickMoneyRoundState {
  pick3: RoundInfo
  pick4: RoundInfo
  // Se llama cuando el countdown de ese gameType llega a 0 (ver RoundCountdownRow.tsx) -- genera
  // el próximo drawNumber y reprograma el próximo sorteo, mismo loop infinito que un reloj real
  // de sorteos periódicos, sin depender de nada externo.
  advanceRound: (gameType: QuickMoneyGameType) => void
}

export const useQuickMoneyRoundStore = create<QuickMoneyRoundState>((set) => ({
  pick3: { nextDrawTime: nextDrawIso('pick3'), drawNumber: randomDrawNumber() },
  pick4: { nextDrawTime: nextDrawIso('pick4'), drawNumber: randomDrawNumber() },

  advanceRound: (gameType) =>
    set(() => ({
      [gameType]: { nextDrawTime: nextDrawIso(gameType), drawNumber: randomDrawNumber() },
    })),
}))
