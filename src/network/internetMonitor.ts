import { useInternetStore } from '../store/useInternetStore'

// Mismo margen que MQTT (mqtt/mqttConnection.ts): sin internet durante más de esto se marca
// offline; un corte más corto no se muestra.
const OFFLINE_GRACE_MS = 10_000
const CHECK_INTERVAL_OK_MS = 15_000
// Mientras falla se comprueba más seguido, para marcar offline a tiempo y volver apenas regrese.
const CHECK_INTERVAL_FAILING_MS = 3_000

let started = false
let failingSince: number | null = null
let timer: ReturnType<typeof setTimeout> | undefined

// true = hay internet, false = no hay, null = no se pudo saber (el servidor local no respondió:
// ese es otro problema, no se culpa a internet).
async function probe(): Promise<boolean | null> {
  // Cable/Wi-Fi desconectado: el navegador lo sabe al instante y no hace falta preguntar.
  if (!navigator.onLine) return false
  // Red local conectada: el servidor Node local comprueba si hay salida (ver
  // server/internetCheck.js). El navegador no puede: navigator.onLine sigue en true con el
  // proveedor caído.
  try {
    const res = await fetch('/terminal/internet', { cache: 'no-store' })
    if (!res.ok) return null
    const data: { online: boolean } = await res.json()
    return data.online
  } catch {
    return null
  }
}

async function check() {
  clearTimeout(timer)
  const online = await probe()

  if (online === false) {
    failingSince ??= Date.now()
    if (Date.now() - failingSince >= OFFLINE_GRACE_MS && !useInternetStore.getState().offline) {
      console.warn('[internet] no internet connection')
      useInternetStore.setState({ offline: true })
    }
  } else if (online === true) {
    failingSince = null
    if (useInternetStore.getState().offline) {
      console.info('[internet] connection restored')
      useInternetStore.setState({ offline: false })
    }
  }

  timer = setTimeout(check, failingSince === null ? CHECK_INTERVAL_OK_MS : CHECK_INTERVAL_FAILING_MS)
}

// Vigila la salida a internet de la máquina, para cualquier pantalla. Se llama una vez desde
// main.tsx; llamadas repetidas no hacen nada.
export function startInternetMonitor(): void {
  if (started) return
  started = true
  // El SO avisa al navegador cuando se conecta/desconecta la red: comprobar al instante en vez de
  // esperar al siguiente ciclo.
  window.addEventListener('offline', () => void check())
  window.addEventListener('online', () => void check())
  void check()
}
