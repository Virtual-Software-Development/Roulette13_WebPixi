import { useBackendStore } from '../store/useBackendStore'

// Mismo margen que MQTT e internet (mqtt/mqttConnection.ts, network/internetMonitor.ts): caído
// durante más de esto se marca offline; un reinicio corto no se muestra.
const OFFLINE_GRACE_MS = 10_000
const CHECK_INTERVAL_OK_MS = 10_000
// Mientras falla se comprueba más seguido, para marcar offline a tiempo y volver apenas regrese.
const CHECK_INTERVAL_FAILING_MS = 3_000
const PROBE_TIMEOUT_MS = 4_000

let started = false
let failingSince: number | null = null
let timer: ReturnType<typeof setTimeout> | undefined

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
  clearTimeout(timer)
  const ready = await probe()

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

  timer = setTimeout(check, failingSince === null ? CHECK_INTERVAL_OK_MS : CHECK_INTERVAL_FAILING_MS)
}

// Vigila que el backend esté listo, para cualquier pantalla (terminal y admin). Se llama una vez
// desde main.tsx; llamadas repetidas no hacen nada.
export function startBackendMonitor(): void {
  if (started) return
  started = true
  void check()
}
