import { create } from 'zustand'

interface InternetState {
  // true solo cuando lleva más de OFFLINE_GRACE_MS sin salida a internet (ver
  // network/internetMonitor.ts) -- un corte de un par de segundos no lo activa.
  offline: boolean
}

// Estado de internet de la MÁQUINA, separado del de MQTT (useMqttStore): sin internet MQTT también
// cae, pero la causa es otra y se le informa distinto al usuario (ver MqttGate.tsx).
export const useInternetStore = create<InternetState>(() => ({ offline: false }))
