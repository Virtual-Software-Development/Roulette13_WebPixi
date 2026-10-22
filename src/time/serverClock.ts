// Reloj del servidor para el lobby -- todas las máquinas corren su línea de tiempo (countdown,
// videos, rueda, Quick Money) contra ESTE reloj y no contra el de cada kiosco, que puede estar
// corrido segundos o minutos. Se mide el offset contra GET /api/time (quick-money-backend) con
// varias muestras y se queda con la de menor ida y vuelta, mismo criterio que NTP/Cristian: con
// RTT bajo, el punto medio del viaje es una buena estimación de cuándo el servidor leyó su reloj.

import { useClockSyncStore } from '../store/useClockSyncStore'

const SAMPLE_COUNT = 5
// Con una ida y vuelta así el error del offset es como mucho la mitad (10 ms), muy por debajo de lo
// que se corrige (useRotorServerSync: 100 ms): más muestras no lo mejoran. En la LAN de las
// terminales suele bastar la primera.
const GOOD_ENOUGH_RTT_MS = 20
const SAMPLE_TIMEOUT_MS = 2_000
const RESYNC_INTERVAL_MS = 5 * 60_000

export interface ClockSample {
  // Reloj local justo antes de pedir y justo después de recibir.
  sentAt: number
  receivedAt: number
  serverTimeMs: number
}

// Solo desarrollo: ?clockSkewMs=N corre el reloj "local" N ms, para verificar que dos ventanas con
// relojes distintos igual muestran lo mismo (el offset medido lo compensa).
const devSkewMs = import.meta.env.DEV
  ? Number(new URLSearchParams(window.location.search).get('clockSkewMs')) || 0
  : 0

let offsetMs = 0
let synced = false
let resyncStarted = false

function localNow(): number {
  return Date.now() + devSkewMs
}

// Hora del servidor estimada, en ms epoch. Reemplaza a Date.now() en toda lógica de tiempo del lobby.
export function serverNow(): number {
  return localNow() + offsetMs
}

export function isClockSynced(): boolean {
  return synced
}

// Offset de la muestra con menor RTT, o null si no hay ninguna.
export function offsetFromSamples(samples: ClockSample[]): number | null {
  let best: ClockSample | null = null
  for (const sample of samples) {
    if (!best || sample.receivedAt - sample.sentAt < best.receivedAt - best.sentAt) best = sample
  }
  if (!best) return null
  const rtt = best.receivedAt - best.sentAt
  return best.serverTimeMs + rtt / 2 - best.receivedAt
}

async function takeSample(): Promise<ClockSample> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SAMPLE_TIMEOUT_MS)
  try {
    const sentAt = localNow()
    const res = await fetch('/api/time', { cache: 'no-store', signal: controller.signal })
    const receivedAt = localNow()
    if (!res.ok) throw new Error(`time request failed: ${res.status}`)
    const { serverTimeMs } = (await res.json()) as { serverTimeMs: number }
    return { sentAt, receivedAt, serverTimeMs }
  } finally {
    clearTimeout(timer)
  }
}

// Mide el offset (muestras en serie, no en paralelo: en paralelo se encolan y todas salen con RTT
// inflado; hasta SAMPLE_COUNT, o menos si una ya es lo bastante precisa). Devuelve true si quedó
// sincronizado con al menos una muestra. Una llamada mientras otra sigue midiendo comparte esa
// medición (al reconectar la piden a la vez useServerClockSync y useRoundSync).
let inFlight: Promise<boolean> | null = null

export function syncServerClock(): Promise<boolean> {
  inFlight ??= measureOffset().finally(() => {
    inFlight = null
  })
  return inFlight
}

async function measureOffset(): Promise<boolean> {
  const samples: ClockSample[] = []
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    try {
      const sample = await takeSample()
      samples.push(sample)
      if (sample.receivedAt - sample.sentAt <= GOOD_ENOUGH_RTT_MS) break
    } catch (err) {
      console.warn('[serverClock] muestra fallida', err)
    }
  }
  const offset = offsetFromSamples(samples)
  if (offset === null) {
    if (!synced) useClockSyncStore.setState({ status: 'failed' })
    return false
  }
  offsetMs = offset
  synced = true
  useClockSyncStore.setState({ status: 'synced' })
  console.log(`[serverClock] offset ${Math.round(offset)} ms (${samples.length} muestras)`)
  return true
}

// Respaldo si /api/time no respondió: el serverTimeMs de /gameInfo, sin corrección de RTT (esa
// consulta toca la base, así que su RTT es más largo y menos simétrico). Nunca pisa una medición buena.
export function applyRoughServerTime(serverTimeMs: number | undefined): void {
  if (synced || !serverTimeMs) return
  offsetMs = serverTimeMs - localNow()
  synced = true
  useClockSyncStore.setState({ status: 'synced' })
  console.warn(`[serverClock] sin /api/time -- offset aproximado de /gameInfo: ${Math.round(offsetMs)} ms`)
}

// Re-mide cada RESYNC_INTERVAL_MS: los relojes de los kioscos derivan con el tiempo.
export function startServerClockResync(): void {
  if (resyncStarted) return
  resyncStarted = true
  setInterval(() => void syncServerClock(), RESYNC_INTERVAL_MS)
}
