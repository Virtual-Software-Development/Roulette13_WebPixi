import { create } from 'zustand'

interface BackendState {
  // true solo cuando el backend lleva más de OFFLINE_GRACE_MS sin estar listo (ver
  // network/backendMonitor.ts): no responde, o responde pero sin base de datos. Un reinicio de un
  // par de segundos no lo activa.
  offline: boolean
}

// Estado del backend visto desde ESTE navegador, separado de MQTT e internet (useMqttStore /
// useInternetStore): con internet y MQTT arriba el backend igual puede estar caído o sin base, y
// entonces la terminal no puede confiar en lo que muestra (ver hooks/useConnectionIssue.ts).
export const useBackendStore = create<BackendState>(() => ({ offline: false }))
