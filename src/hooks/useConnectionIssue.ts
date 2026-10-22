import { useBackendStore } from '../store/useBackendStore'
import { useClockSyncStore } from '../store/useClockSyncStore'
import { useInternetStore } from '../store/useInternetStore'
import { useMqttStore } from '../store/useMqttStore'

export type ConnectionIssue = 'noInternet' | 'backendOffline' | 'mqttOffline' | 'clockUnsynced'

// Qué vigila cada tipo de pantalla:
// - 'terminal' (lobbies y vistas de apuesta): internet, backend y MQTT. Los stores de internet y
//   MQTT solo se mueven en los servidores de Juego y Betting (main.tsx); en el Admin quedan en false.
// - 'betting': lo mismo + el reloj del servidor (useServerClockSync), porque el cierre de apuestas
//   se calcula con él.
// - 'admin': solo el backend -- el Admin no es una terminal (sin MQTT ni chequeo de internet).
export type ConnectionScope = 'terminal' | 'betting' | 'admin'

interface ConnectionFlags {
  internetOffline: boolean
  backendOffline: boolean
  mqttOffline: boolean
  clockFailed: boolean
}

// Una sola causa, por prioridad: sin internet también cae lo demás, pero la causa a informar es
// internet; con el backend caído MQTT puede seguir conectado, pero los datos ya no son confiables.
function pickIssue(scope: ConnectionScope, flags: ConnectionFlags): ConnectionIssue | null {
  if (scope === 'admin') return flags.backendOffline ? 'backendOffline' : null
  if (flags.internetOffline) return 'noInternet'
  if (flags.backendOffline) return 'backendOffline'
  if (flags.mqttOffline) return 'mqttOffline'
  if (scope === 'betting' && flags.clockFailed) return 'clockUnsynced'
  return null
}

function currentFlags(): ConnectionFlags {
  return {
    internetOffline: useInternetStore.getState().offline,
    backendOffline: useBackendStore.getState().offline,
    mqttOffline: useMqttStore.getState().offline,
    clockFailed: useClockSyncStore.getState().status === 'failed',
  }
}

// Por qué la pantalla no puede confiar en el backend ahora mismo, o null si está todo bien. Cada
// store ya aplica su margen de ~10 s, así que un corte corto no llega acá. Se limpia solo al
// recuperarse.
export function useConnectionIssue(scope: ConnectionScope): ConnectionIssue | null {
  const internetOffline = useInternetStore((state) => state.offline)
  const backendOffline = useBackendStore((state) => state.offline)
  const mqttOffline = useMqttStore((state) => state.offline)
  const clockFailed = useClockSyncStore((state) => state.status === 'failed')
  return pickIssue(scope, { internetOffline, backendOffline, mqttOffline, clockFailed })
}

// Avisa cada vez que la causa de `scope` cambia (de una a otra, o de/hacia null). Fuera de React a
// propósito: lo usan tanto hooks como módulos (api/machineBalance.ts, store/staleGlobalData.ts).
// Devuelve la función para dejar de escuchar.
function onIssueChange(
  scope: ConnectionScope,
  onChange: (previous: ConnectionIssue | null, next: ConnectionIssue | null) => void,
): () => void {
  let issue = pickIssue(scope, currentFlags())
  const check = () => {
    const next = pickIssue(scope, currentFlags())
    if (next === issue) return
    const previous = issue
    issue = next
    onChange(previous, next)
  }
  const unsubscribers = [
    useInternetStore.subscribe(check),
    useBackendStore.subscribe(check),
    useMqttStore.subscribe(check),
    useClockSyncStore.subscribe(check),
  ]
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
}

// Llama a `onRestored` cada vez que la pantalla vuelve a poder confiar en el backend (había una
// causa en `scope` y ya no queda ninguna) -- el momento de volver a pedir lo que se pudo perder
// durante el corte (ronda, reloj, saldo, resultados) en vez de esperar al próximo timer de
// respaldo.
export function onConnectionRestored(scope: ConnectionScope, onRestored: () => void): () => void {
  return onIssueChange(scope, (previous, next) => {
    if (previous !== null && next === null) onRestored()
  })
}

// Llama a `onLost` cada vez que la pantalla deja de poder confiar en el backend (no había ninguna
// causa en `scope` y ahora sí; ya pasado el margen de ~10 s de cada store).
export function onConnectionLost(scope: ConnectionScope, onLost: () => void): () => void {
  return onIssueChange(scope, (previous, next) => {
    if (previous === null && next !== null) onLost()
  })
}
