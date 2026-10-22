// Suscripciones a tópicos MQTT para cualquier pantalla, sin importar mqtt.js (la conexión se carga
// aparte, ver mqttConnection.ts): una pantalla registra un handler para un tópico y mqttConnection
// se suscribe y le reparte los mensajes. Los handlers se pueden registrar antes de conectar; al
// conectar (y en cada reconexión) se suscribe a todos los tópicos registrados.

// Apuestas de la ronda abierta de ruleta, sumadas en toda la flota (BetsSummaryResponse): el backend
// las publica (retenidas) cada vez que se guarda un ticket y al abrir cada ronda (internal/betsfeed).
export const ROULETTE_BETS_TOPIC = 'qm/v1/games/roulette/bets'

// Estado del backend ({ready}, retenido): lo publica cada 10 s, y si el proceso muere EMQX publica
// ready=false en su lugar (último deseo de su conexión). Ver network/backendMonitor.ts.
export const BACKEND_STATUS_TOPIC = 'qm/v1/backend/status'

// Estado de cada sorteo de Quick Money (event.state, retenido): el backend lo publica en cada cambio
// de estado (abierto, cerrado, en curso, liquidado).
export const LOTTERY_EVENT_TOPIC = 'qm/v1/games/lottery/event'

// Saldo de una máquina (el mismo cuerpo que GET /api/machine/balance, retenido): el backend lo
// publica cada vez que cambia (internal/machinefeed). Una terminal solo puede leer el de su máquina.
export function machineBalanceTopic(machineId: number): string {
  return `qm/v1/machines/${machineId}/balance`
}

type Handler = (message: unknown) => void

const handlers = new Map<string, Set<Handler>>()
let subscribe: ((topic: string) => void) | null = null

// Registra handler para los mensajes (JSON ya parseado) de topic. Devuelve la baja.
export function onMqttMessage(topic: string, handler: Handler): () => void {
  let set = handlers.get(topic)
  if (!set) {
    set = new Set()
    handlers.set(topic, set)
    subscribe?.(topic)
  }
  set.add(handler)
  return () => {
    set.delete(handler)
  }
}

// Para mqttConnection al conectar: cómo suscribirse desde ahora, y los tópicos ya registrados.
export function attachMqttSubscriber(subscriber: (topic: string) => void): string[] {
  subscribe = subscriber
  return [...handlers.keys()]
}

// Para mqttConnection: reparte un mensaje recibido a los handlers de su tópico.
export function dispatchMqttMessage(topic: string, payload: string): void {
  const set = handlers.get(topic)
  if (!set || set.size === 0) return
  let message: unknown
  try {
    message = JSON.parse(payload)
  } catch {
    console.warn(`[mqtt] message on ${topic} is not JSON -- ignored`)
    return
  }
  for (const handler of set) {
    try {
      handler(message)
    } catch (err) {
      console.error(`[mqtt] handler for ${topic} failed`, err)
    }
  }
}
