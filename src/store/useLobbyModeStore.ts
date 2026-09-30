import { create } from 'zustand'
import type { QuickMoneyLobbyDraw } from '../data/quickMoneyLobbyMockData'
import { useDrawCycleStore } from './useDrawCycleStore'

// Fase del lobby principal compartido Roulette + Quick Money -- ver config/quickMoneyLobbyCycle.ts
// para la secuencia completa y los tiempos. La escribe únicamente useQuickMoneyLobbyCycle (y
// QuickMoneyVideoView al terminar su video).
export type LobbyPhase = 'roulette' | 'quickMoneySplit' | 'quickMoneyVideo' | 'quickMoneyResult'

interface LobbyModeState {
  phase: LobbyPhase
  setPhase: (phase: LobbyPhase) => void
  // Sorteo de Quick Money en curso: se fija al llegar la hora del sorteo y se publica en la tabla
  // recién cuando termina su video (igual que Roulette, que no muestra el resultado antes).
  pendingDraw: QuickMoneyLobbyDraw | null
  setPendingDraw: (pendingDraw: QuickMoneyLobbyDraw | null) => void
}

export const useLobbyModeStore = create<LobbyModeState>((set) => ({
  phase: 'roulette',
  setPhase: (phase) => set({ phase }),
  pendingDraw: null,
  setPendingDraw: (pendingDraw) => set({ pendingDraw }),
}))

export function isQuickMoneySplitPhase(phase: LobbyPhase): boolean {
  return phase !== 'roulette'
}

// ¿Se ve el split de Quick Money? Fuente única para QuickMoneySplitOverlay (paneles y texto, encima
// del canvas) y QuickMoneySplitBackdrop (fondo del panel de Roulette, debajo de la rueda) -- así
// entran y salen juntos. Oculto también mientras hay una ronda de Roulette en pantalla.
export function useQuickMoneySplitVisible(): boolean {
  const phase = useLobbyModeStore((state) => state.phase)
  const lobbyInfoVisible = useDrawCycleStore((state) => state.lobbyInfoVisible)
  return (phase === 'quickMoneySplit' || phase === 'quickMoneyResult') && lobbyInfoVisible
}

// Reemplaza a lobbyInfoVisible como gate de los paneles propios del lobby de Roulette (tabla de
// resultados, live bets, hot/cold, spin stats): además de ocultarse durante el sorteo de Roulette,
// salen de escena mientras el lobby está en el bloque de Quick Money.
export function useRoulettePanelsVisible(): boolean {
  const lobbyInfoVisible = useDrawCycleStore((state) => state.lobbyInfoVisible)
  const phase = useLobbyModeStore((state) => state.phase)
  return lobbyInfoVisible && phase === 'roulette'
}
