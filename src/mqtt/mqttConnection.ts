import mqtt, { type MqttClient } from 'mqtt'
import { env } from '../config/env'
import { fetchMqttCredentials, fetchPhysicalAddress } from '../api/mqttCredentials'
import { useMqttStore } from '../store/useMqttStore'

// Margen antes de dar la conexión por caída -- tanto en el arranque (MAC + credenciales + primer
// CONNECT) como tras perderla. Evita reaccionar a un corte de 1-2 s (reconexión normal de mqtt.js).
const OFFLINE_GRACE_MS = 10_000
const RECONNECT_PERIOD_MS = 2_000
// Reintento de la consulta de MAC/credenciales: backend caído o MAC aún no autorizada (puede
// autorizarse después sin reiniciar la terminal).
const CREDENTIALS_RETRY_MS = 10_000
// CONNACK de credenciales rechazadas: 4/5 en MQTT 3.1.1 (bad user/pass, not authorized), 134/135
// en MQTT 5.
const AUTH_REJECTED_CODES = new Set([4, 5, 134, 135])

// Por defecto mismo origen (/mqtt): Vite (dev) y server.js (prod) reenvían el WebSocket a
// MQTT_WS_URL, así la terminal no necesita ver el puerto 8083/8084 ni hay problema de mixed
// content con https. No se usan mqttServerIp/mqttServerPort de las credenciales: el navegador solo
// habla MQTT sobre WebSocket, no por TCP (1883/8883).
function brokerUrl() {
  if (env.mqttUrl) return env.mqttUrl
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/mqtt`
}

let started = false
let client: MqttClient | undefined
let graceTimer: ReturnType<typeof setTimeout> | undefined

// Cliente MQTT de la máquina, para quien necesite suscribirse a algo (undefined mientras se piden
// credenciales o tras un rechazo). Revisar useMqttStore.status antes de usarlo.
export function getMqttClient(): MqttClient | undefined {
  return client
}

function armGraceTimer() {
  if (graceTimer) return
  graceTimer = setTimeout(() => {
    graceTimer = undefined
    if (useMqttStore.getState().status !== 'connected') useMqttStore.setState({ offline: true })
  }, OFFLINE_GRACE_MS)
}

function retryLater() {
  setTimeout(connect, CREDENTIALS_RETRY_MS)
}

async function connect() {
  let physicalAddress = useMqttStore.getState().physicalAddress
  let creds
  try {
    // La MAC no cambia mientras corre la app: se lee una vez y se reusa en los reintentos.
    if (!physicalAddress) {
      physicalAddress = await fetchPhysicalAddress()
      useMqttStore.setState({ physicalAddress })
    }
    creds = await fetchMqttCredentials(physicalAddress)
  } catch (err) {
    console.warn('[mqtt] could not fetch MAC/credentials:', err instanceof Error ? err.message : err)
    retryLater()
    return
  }
  if (!creds.Autorizado) {
    console.error(`[mqtt] Device ${physicalAddress} is not authorized for MQTT -- retrying.`)
    retryLater()
    return
  }

  const current = mqtt.connect(brokerUrl(), {
    username: creds.mqttUserName,
    password: creds.mqttPasswd,
    clientId: creds.mqttIdClient,
    reconnectPeriod: RECONNECT_PERIOD_MS,
    connectTimeout: OFFLINE_GRACE_MS,
  })
  client = current

  current.on('connect', () => {
    clearTimeout(graceTimer)
    graceTimer = undefined
    useMqttStore.setState({ status: 'connected', offline: false })
    console.info(`[mqtt] connected as ${creds.mqttIdClient}`)
  })
  current.on('close', () => {
    if (client !== current) return
    useMqttStore.setState({ status: 'disconnected' })
    armGraceTimer()
  })
  current.on('error', (err) => {
    console.warn('[mqtt]', err.message)
    // EMQX rechazó usuario/contraseña: reintentar con las mismas no sirve (pueden haber cambiado
    // o la MAC dejó de estar autorizada), así que se vuelven a pedir al backend.
    const code = 'code' in err ? Number(err.code) : NaN
    if (client === current && AUTH_REJECTED_CODES.has(code)) {
      client = undefined
      useMqttStore.setState({ status: 'disconnected' })
      armGraceTimer()
      current.end(true)
      retryLater()
    }
  })
}

// Abre la conexión MQTT de la máquina. Se llama una vez desde main.tsx, para cualquier pantalla;
// llamadas repetidas no hacen nada. Credenciales: MAC de esta computadora (server/terminalInfo.js)
// -> GET /api/mqtt-credentials/{mac} -> CONNECT con mqttUserName/mqttPasswd/mqttIdClient. El
// clientid es fijo por MAC, así que dos pestañas de la misma terminal se desconectan entre sí en
// EMQX. mqtt.js reintenta solo; si EMQX rechaza las credenciales se vuelven a pedir.
export function startMqttConnection(): void {
  if (started) return
  started = true
  armGraceTimer()
  void connect()
}
