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

// Por qué la pantalla no puede confiar en el backend ahora mismo, o null si está todo bien. Una sola
// causa, por prioridad: sin internet también cae lo demás, pero la causa a informar es internet; con
// el backend caído MQTT puede seguir conectado, pero los datos ya no son confiables. Cada store ya
// aplica su margen de ~10 s, así que un corte corto no llega acá. Se limpia solo al recuperarse.
export function useConnectionIssue(scope: ConnectionScope): ConnectionIssue | null {
  const internetOffline = useInternetStore((state) => state.offline)
  const backendOffline = useBackendStore((state) => state.offline)
  const mqttOffline = useMqttStore((state) => state.offline)
  const clockFailed = useClockSyncStore((state) => state.status === 'failed')

  if (scope === 'admin') return backendOffline ? 'backendOffline' : null
  if (internetOffline) return 'noInternet'
  if (backendOffline) return 'backendOffline'
  if (mqttOffline) return 'mqttOffline'
  if (scope === 'betting' && clockFailed) return 'clockUnsynced'
  return null
}
