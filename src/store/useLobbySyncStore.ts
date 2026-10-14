import { create } from 'zustand'

// Estado de la pantalla "Sincronizando…" (SyncOverlay) del lobby. Se muestra:
// - al arrancar, hasta tener el reloj del servidor, /gameInfo y las apuestas del lobby (bootDone);
// - y si la máquina entró a mitad de un video (Roulette o Quick Money), hasta que ese video termina
//   en las demás máquinas (holdUntilMs, hora del servidor) -- no se salta al medio del video.
interface LobbySyncState {
  bootDone: boolean
  holdUntilMs: number
  // Hora del servidor en que arrancó este lobby -- Quick Money la usa para saber si la máquina llegó
  // tarde para descargar el video del sorteo (ver useQuickMoneyLobbyCycle).
  bootAtMs: number
  setBootDone: () => void
  // Solo extiende: dos motivos superpuestos se quedan con el que termina más tarde.
  holdUntil: (untilMs: number) => void
  reset: (bootAtMs: number) => void
}

export const useLobbySyncStore = create<LobbySyncState>((set) => ({
  bootDone: false,
  holdUntilMs: 0,
  bootAtMs: 0,
  setBootDone: () => set({ bootDone: true }),
  holdUntil: (untilMs) => set((state) => ({ holdUntilMs: Math.max(state.holdUntilMs, untilMs) })),
  reset: (bootAtMs) => set({ bootDone: false, holdUntilMs: 0, bootAtMs }),
}))

export function isLobbySyncing(state: Pick<LobbySyncState, 'bootDone' | 'holdUntilMs'>, nowMs: number): boolean {
  return !state.bootDone || nowMs < state.holdUntilMs
}
