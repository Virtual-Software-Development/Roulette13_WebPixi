import { useBackendStore } from '../store/useBackendStore'
import { BACKEND_STATUS_TOPIC, onMqttMessage } from '../mqtt/topics'

// Mismo margen que MQTT e internet (mqtt/mqttConnection.ts, network/internetMonitor.ts): caído
// durante más de esto se marca offline; un reinicio corto no se muestra.
const OFFLINE_GRACE_MS = 10_000
const CHECK_INTERVAL_OK_MS = 10_000
// Con el aviso del backend llegando por MQTT (BACKEND_STATUS_TOPIC, cada 10 s) /readyz es solo una
// red de seguridad -- p. ej. el camino HTTP de la terminal al backend cortado con MQTT andando.
const CHECK_INTERVAL_HEARTBEAT_MS = 60_000
// Sin aviso durante esto (backend colgado, máquina apagada, MQTT caído) se vuelve a /readyz enseguida.
const HEARTBEAT_STALE_MS = 25_000
// Mientras falla se comprueba más seguido, para marcar offline a tiempo y volver apenas regrese.
const CHECK_INTERVAL_FAILING_MS = 3_000
const PROBE_TIMEOUT_MS = 4_000

let started = false
let failingSince: number | null = null
let timer: ReturnType<typeof setTimeout> | undefined
// Hora local del último aviso ready=true del backend por MQTT (null: no hay uno vigente).
let heartbeatAt: number | null = null
let staleTimer: ReturnType<typeof setTimeout> | undefined
// Un aviso por MQTT puede pedir una comprobación con otra en curso: esa ya trae la respuesta.
let probing = false

// /readyz del backend (proxy /backend/readyz, ver vite.config.ts y server.js): 200 solo si el
// proceso responde Y llega a la base de datos (503 si no). /api/time no sirve para esto: contesta
// aunque la base esté caída. Cualquier otra cosa (502 del proxy, timeout, red) también es "no listo".
async function probe(): Promise<boolean> {
  const controller = new AbortController()
  const abortTimer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  try {
    const res = await fetch('/backend/readyz', { cache: 'no-store', signal: controller.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(abortTimer)
  }
}

async function check() {
  if (probing) return
  probing = true
  clearTimeout(timer)
  const ready = await probe()
  probing = false

  if (!ready) {
    failingSince ??= Date.now()
    if (Date.now() - failingSince >= OFFLINE_GRACE_MS && !useBackendStore.getState().offline) {
      console.warn('[backend] not ready (down or without database)')
      useBackendStore.setState({ offline: true })
    }
  } else {
    failingSince = null
    if (useBackendStore.getState().offline) {
      console.info('[backend] ready again')
      useBackendStore.setState({ offline: false })
    }
  }

  timer = setTimeout(check, nextCheckMs())
}

function nextCheckMs(): number {
  if (failingSince !== null) return CHECK_INTERVAL_FAILING_MS
  const fresh = heartbeatAt !== null && Date.now() - heartbeatAt < HEARTBEAT_STALE_MS
  return fresh ? CHECK_INTERVAL_HEARTBEAT_MS : CHECK_INTERVAL_OK_MS
}

// El aviso del backend por MQTT. ready=false (o un ready=true estando caído) se confirma con
// /readyz al instante: el banner sigue dependiendo de una sola fuente, con el mismo margen.
export function onBackendStatus(message: unknown): void {
  const ready = typeof message === 'object' && message !== null && (message as { ready?: unknown }).ready === true
  clearTimeout(staleTimer)
  if (!ready) {
    heartbeatAt = null
    void check()
    return
  }
  heartbeatAt = Date.now()
  staleTimer = setTimeout(() => {
    heartbeatAt = null
    void check()
  }, HEARTBEAT_STALE_MS)
  if (failingSince !== null) void check()
}

// Vigila que el backend esté listo, para cualquier pantalla (terminal y admin). Se llama una vez
// desde main.tsx; llamadas repetidas no hacen nada.
export function startBackendMonitor(): void {
  if (started) return
  started = true
  // Solo llega en las terminales (el Admin no abre MQTT): ahí sigue /readyz cada 10 s.
  onMqttMessage(BACKEND_STATUS_TOPIC, onBackendStatus)
  void check()
}
