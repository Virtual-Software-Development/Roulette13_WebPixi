import { create } from 'zustand'

// Estado de la pantalla "Sincronizando…" (SyncOverlay) del lobby. Se muestra:
// - al arrancar, hasta tener el reloj del servidor, /gameInfo y las apuestas del lobby (bootDone);
// - y en los tramos cortos de un sorteo de Roulette en los que no hay nada propio que mostrar
//   (holdUntilMs, hora del servidor): los ~2s antes de su hora programada y la bajada final de la
//   rueda. Si la máquina entra a mitad de un VIDEO (Roulette o Quick Money) no espera acá: muestra el
//   panel de video no disponible, sincronizado con las demás (ver joinDrawInProgress y
//   useQuickMoneyLobbyCycle).
interface LobbySyncState {
  bootDone: boolean
  holdUntilMs: number
  setBootDone: () => void
  // Solo extiende: dos motivos superpuestos se quedan con el que termina más tarde.
  holdUntil: (untilMs: number) => void
  reset: () => void
}

export const useLobbySyncStore = create<LobbySyncState>((set) => ({
  bootDone: false,
  holdUntilMs: 0,
  setBootDone: () => set({ bootDone: true }),
  holdUntil: (untilMs) => set((state) => ({ holdUntilMs: Math.max(state.holdUntilMs, untilMs) })),
  reset: () => set({ bootDone: false, holdUntilMs: 0 }),
}))

export function isLobbySyncing(state: Pick<LobbySyncState, 'bootDone' | 'holdUntilMs'>, nowMs: number): boolean {
  return !state.bootDone || nowMs < state.holdUntilMs
}
