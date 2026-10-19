import { create } from 'zustand'

// 'pending' hasta terminar la primera medición, 'synced' con al menos una medición buena (las
// re-mediciones que fallan después conservan el offset anterior, que sigue siendo válido) y
// 'failed' si ninguna medición funcionó todavía: la pantalla está usando el reloj de Windows del
// kiosco, que puede estar corrido. Lo escribe time/serverClock.ts.
export type ClockSyncStatus = 'pending' | 'synced' | 'failed'

export const useClockSyncStore = create<{ status: ClockSyncStatus }>(() => ({ status: 'pending' }))
