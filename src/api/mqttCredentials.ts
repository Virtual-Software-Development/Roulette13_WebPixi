// Credenciales MQTT de esta terminal, por su physical address (MAC). Ver quick-money-backend:
// internal/mqttcreds. Si la MAC no está registrada o no está autorizada, el backend devuelve solo
// { Autorizado: false }, sin el resto de campos.
export interface MqttCredentials {
  mqttUserName: string
  mqttPasswd: string
  Autorizado: boolean
  mqttServerIp: string
  mqttServerPort: number
  mqttTimeout: number
  mqttIdClient: string
}

// MAC de esta computadora. La lee el servidor Node que sirve la app (corre en la misma terminal),
// porque el navegador no tiene acceso a ella -- ver server/terminalInfo.js.
export async function fetchPhysicalAddress(signal?: AbortSignal): Promise<string> {
  const res = await fetch('/terminal/physical-address', { signal, cache: 'no-store' })
  if (!res.ok) throw new Error(`physical-address request failed: ${res.status}`)
  const data: { physicalAddress: string } = await res.json()
  return data.physicalAddress
}

export async function fetchMqttCredentials(physicalAddress: string, signal?: AbortSignal): Promise<MqttCredentials> {
  const res = await fetch(`/api/mqtt-credentials/${encodeURIComponent(physicalAddress)}`, { signal })
  if (!res.ok) throw new Error(`mqtt-credentials request failed: ${res.status}`)
  return res.json()
}
