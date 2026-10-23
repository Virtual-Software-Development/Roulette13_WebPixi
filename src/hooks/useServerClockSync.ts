import { useEffect } from 'react'
import { startServerClockResync, syncServerClock } from '../time/serverClock'
import { useClockSyncStore } from '../store/useClockSyncStore'
import { onConnectionRestored } from './useConnectionIssue'

// Mientras no hubo ninguna medición buena se reintenta seguido: hasta entonces la pantalla corre con
// el reloj del kiosco (ver useConnectionIssue: las apuestas quedan bloqueadas), y esperar al
// re-sync normal de 5 min la dejaría bloqueada mucho después de que el backend volvió.
const RETRY_UNSYNCED_MS = 10_000

// Sincroniza serverNow() con el backend en pantallas que no montan el lobby (App.tsx lo hace por su
// cuenta): las vistas de apuesta. Sin esto, su countdown y el cierre de apuestas usaban el reloj de
// Windows del kiosco, que puede estar corrido segundos o minutos.
export function useServerClockSync(): void {
  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const attempt = () => {
      void syncServerClock().then(() => {
        if (cancelled) return
        if (useClockSyncStore.getState().status === 'synced') {
          startServerClockResync()
        } else {
          retryTimer = setTimeout(attempt, RETRY_UNSYNCED_MS)
        }
      })
    }
    attempt()
    // Al volver la conexión se re-mide ya: durante el corte el re-sync de 5 min pudo fallar, y el
    // countdown y el cierre de apuestas dependen de este offset.
    const stopRestored = onConnectionRestored('terminal', () => void syncServerClock())

    return () => {
      cancelled = true
      clearTimeout(retryTimer)
      stopRestored()
    }
  }, [])
}
