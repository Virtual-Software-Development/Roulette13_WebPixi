import { create } from 'zustand'

export type MqttStatus = 'connecting' | 'connected' | 'disconnected'

interface MqttState {
  // Estado instantáneo del cliente: 'connecting' hasta el primer CONNECT aceptado,
  // 'disconnected' en cuanto se cae (mqtt.js ya está reintentando).
  status: MqttStatus
  // true solo cuando lleva más de OFFLINE_GRACE_MS sin conexión (ver mqtt/mqttConnection.ts) --
  // es lo que deben mirar las vistas para reaccionar, no `status`, para no parpadear con cada
  // reconexión corta.
  offline: boolean
  // MAC de esta computadora con la que se pidieron las credenciales (null hasta leerla).
  physicalAddress: string | null
}

// Estado MQTT de la MÁQUINA, no de una vista: una sola conexión para toda la app, abierta en
// main.tsx al arrancar (startMqttConnection) y viva en cualquier pantalla. Este store no importa
// mqtt.js, así que leerlo no arrastra la librería a ningún chunk.
export const useMqttStore = create<MqttState>(() => ({
  status: 'connecting',
  offline: false,
  physicalAddress: null,
}))
