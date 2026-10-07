// Duración de un video de sorteo SIN reproducirlo ni pasar por un <video> -- la necesita
// VideoErrorRound justo cuando el <video> es lo que falló (ver App.tsx). Lee solo el encabezado
// del .webm (el elemento Duration de Segment > Info, que los videos de la librería traen escrito
// a ~250 bytes del inicio -- verificado con ffprobe sobre local-media/Videos) en vez de bajar el
// archivo entero (~25MB).

const HEADER_BYTES = 64 * 1024
const FETCH_TIMEOUT_MS = 3000

const ID_EBML = 0x1a45dfa3
const ID_SEGMENT = 0x18538067
const ID_INFO = 0x1549a966
const ID_CLUSTER = 0x1f43b675
const ID_TIMECODE_SCALE = 0x2ad7b1
const ID_DURATION = 0x4489

// TimecodeScale por defecto de Matroska/WebM: 1ms por tick (en ns).
const DEFAULT_TIMECODE_SCALE_NS = 1_000_000

interface Vint {
  value: number
  length: number
  // Tamaño "desconocido" (todos los bits de datos en 1) -- válido para Segment en streams en vivo.
  unknown: boolean
}

// Entero de largo variable de EBML: la cantidad de ceros iniciales del primer byte dice cuántos
// bytes ocupa. Los IDs se leen CON el bit marcador (así están definidos los ID_* de arriba), los
// tamaños sin él. Aritmética con * en vez de << para no desbordar 32 bits.
function readVint(bytes: Uint8Array, pos: number, keepMarker: boolean): Vint | null {
  if (pos >= bytes.length) return null
  const first = bytes[pos]
  let length = 1
  while (length <= 8 && !(first & (0x80 >> (length - 1)))) length++
  if (length > 8 || pos + length > bytes.length) return null

  let value = keepMarker ? first : first & (0xff >> length)
  let allOnes = value === 0xff >> length
  for (let i = 1; i < length; i++) {
    value = value * 256 + bytes[pos + i]
    if (bytes[pos + i] !== 0xff) allOnes = false
  }
  return { value, length, unknown: !keepMarker && allOnes }
}

function readUint(bytes: Uint8Array, pos: number, size: number): number {
  let value = 0
  for (let i = 0; i < size; i++) value = value * 256 + bytes[pos + i]
  return value
}

function readFloat(bytes: Uint8Array, pos: number, size: number): number | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset + pos, size)
  if (size === 4) return view.getFloat32(0)
  if (size === 8) return view.getFloat64(0)
  return null
}

// Duración en ms leída de los primeros bytes de un .webm, o null si no está (o no es un webm).
export function parseWebmDurationMs(bytes: Uint8Array): number | null {
  let pos = 0
  let insideSegment = false

  while (pos < bytes.length) {
    const id = readVint(bytes, pos, true)
    if (!id) return null
    const size = readVint(bytes, pos + id.length, false)
    if (!size) return null
    const dataStart = pos + id.length + size.length

    if (!insideSegment) {
      if (pos === 0 && id.value !== ID_EBML) return null
      if (id.value === ID_SEGMENT) {
        // Se entra a los hijos de Segment (SeekHead, Void, Info, ...) en vez de saltearlo.
        insideSegment = true
        pos = dataStart
        continue
      }
    } else if (id.value === ID_INFO) {
      return parseInfo(bytes, dataStart, Math.min(bytes.length, dataStart + size.value))
    } else if (id.value === ID_CLUSTER) {
      // Ya empezaron los frames: si Info no apareció antes, no está en el encabezado.
      return null
    }

    if (size.unknown) return null
    pos = dataStart + size.value
  }
  return null
}

function parseInfo(bytes: Uint8Array, start: number, end: number): number | null {
  let timecodeScaleNs = DEFAULT_TIMECODE_SCALE_NS
  let duration: number | null = null
  let pos = start

  while (pos < end) {
    const id = readVint(bytes, pos, true)
    if (!id) break
    const size = readVint(bytes, pos + id.length, false)
    if (!size || size.unknown) break
    const dataStart = pos + id.length + size.length
    if (dataStart + size.value > bytes.length) break

    if (id.value === ID_TIMECODE_SCALE) timecodeScaleNs = readUint(bytes, dataStart, size.value)
    if (id.value === ID_DURATION) duration = readFloat(bytes, dataStart, size.value)
    pos = dataStart + size.value
  }

  if (duration === null || !Number.isFinite(duration) || duration <= 0) return null
  return (duration * timecodeScaleNs) / 1_000_000
}

// Baja solo los primeros HEADER_BYTES (Range) -- y aunque el servidor ignorara el Range y
// respondiera el archivo entero, corta la lectura del stream ahí.
async function fetchHeaderBytes(url: string, signal: AbortSignal): Promise<Uint8Array> {
  const res = await fetch(url, { headers: { Range: `bytes=0-${HEADER_BYTES - 1}` }, signal })
  if (!res.ok || !res.body) throw new Error(`fetchHeaderBytes: ${url} respondió ${res.status}`)

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (total < HEADER_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.length
  }
  void reader.cancel()

  const bytes = new Uint8Array(Math.min(total, HEADER_BYTES))
  let offset = 0
  for (const chunk of chunks) {
    const slice = chunk.subarray(0, bytes.length - offset)
    bytes.set(slice, offset)
    offset += slice.length
    if (offset >= bytes.length) break
  }
  return bytes
}

export async function fetchVideoDurationMs(url: string): Promise<number> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const durationMs = parseWebmDurationMs(await fetchHeaderBytes(url, controller.signal))
    if (durationMs === null) throw new Error(`fetchVideoDurationMs: ${url} no trae Duration en el encabezado`)
    return durationMs
  } finally {
    clearTimeout(timeout)
  }
}
