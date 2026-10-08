// Duración de un video de sorteo SIN reproducirlo ni pasar por un <video> -- la necesita
// VideoErrorRound justo cuando el <video> es lo que falló (ver App.tsx). Lee solo lo necesario en
// vez de bajar el archivo entero:
//   .webm -- el elemento Duration de Segment > Info, a ~250 bytes del inicio (verificado con
//            ffprobe sobre local-media/Videos).
//   .mp4  -- el mvhd dentro del moov. Los MP4 de la librería (Videos/SORTED) NO son faststart: el
//            moov va al FINAL, después del mdat (ftyp free mdat moov, verificado sobre los 483). Se
//            recorren las cajas de primer nivel por su tamaño y se pide con Range solo el tramo
//            donde empieza el moov.

const HEADER_BYTES = 64 * 1024
// Del moov solo hace falta el principio: el mvhd es su primera caja (108-120 bytes).
const MOOV_PROBE_BYTES = 4 * 1024
// Tramos a pedir después del primero antes de rendirse (alcanza para ftyp, free, mdat, moov).
const MAX_MP4_FETCHES = 4
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

// ---------------------------------------------------------------------------------------------
// MP4 (ISO BMFF): cajas [tamaño u32][tipo 4cc]; tamaño 1 = u64 a continuación, 0 = hasta el final.

function boxType(bytes: Uint8Array, pos: number): string {
  return String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3])
}

interface Mp4Box {
  type: string
  start: number
  headerSize: number
  // null = la caja llega hasta el final del archivo (tamaño 0).
  size: number | null
}

function readMp4Box(bytes: Uint8Array, pos: number): Mp4Box | null {
  if (pos + 8 > bytes.length) return null
  const size32 = readUint(bytes, pos, 4)
  const type = boxType(bytes, pos + 4)
  if (size32 === 1) {
    if (pos + 16 > bytes.length) return null
    return { type, start: pos, headerSize: 16, size: readUint(bytes, pos + 8, 8) }
  }
  if (size32 !== 0 && size32 < 8) return null
  return { type, start: pos, headerSize: 8, size: size32 === 0 ? null : size32 }
}

// Duración en ms del mvhd (primera caja hija del moov), o null si no entró en `bytes`.
function parseMoov(bytes: Uint8Array, moov: Mp4Box): number | null {
  const mvhd = readMp4Box(bytes, moov.start + moov.headerSize)
  if (!mvhd || mvhd.type !== 'mvhd') return null
  const body = mvhd.start + mvhd.headerSize
  const version = bytes[body]
  // version 0: creation(4) modification(4) timescale(4) duration(4); version 1: 8/8/4/8.
  const timescaleAt = body + (version === 1 ? 20 : 12)
  const durationSize = version === 1 ? 8 : 4
  if (timescaleAt + 4 + durationSize > bytes.length) return null
  const timescale = readUint(bytes, timescaleAt, 4)
  const duration = readUint(bytes, timescaleAt + 4, durationSize)
  if (!timescale || !duration) return null
  return (duration / timescale) * 1000
}

export type Mp4ScanResult = { durationMs: number } | { nextOffset: number } | null

// Recorre las cajas de primer nivel de un tramo del archivo que empieza en el byte `baseOffset`
// (siempre en un límite de caja). Devuelve la duración si el moov (con su mvhd) está en el tramo,
// el offset absoluto desde donde pedir el siguiente tramo si todavía no apareció, o null si no es un
// MP4 válido.
export function scanMp4TopLevel(bytes: Uint8Array, baseOffset: number): Mp4ScanResult {
  let pos = 0
  while (pos < bytes.length) {
    const box = readMp4Box(bytes, pos)
    if (!box) return { nextOffset: baseOffset + pos }
    if (baseOffset === 0 && pos === 0 && box.type !== 'ftyp') return null
    if (box.type === 'moov') {
      const durationMs = parseMoov(bytes, box)
      if (durationMs !== null) return { durationMs }
      // El moov empieza acá pero su mvhd no entró: pedirlo desde el moov -- salvo que el tramo ya
      // empiece en el moov, y entonces el archivo está mal formado.
      return pos === 0 ? null : { nextOffset: baseOffset + pos }
    }
    if (box.size === null) return null
    pos += box.size
  }
  return { nextOffset: baseOffset + pos }
}

function isMp4(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && boxType(bytes, 4) === 'ftyp'
}

// Baja `length` bytes desde `start` (Range) -- y aunque el servidor ignorara el Range y respondiera
// el archivo entero, corta la lectura del stream ahí. Desde un offset > 0 exige un 206: un 200
// traería el archivo desde el byte 0 y los offsets no coincidirían.
async function fetchBytes(url: string, start: number, length: number, signal: AbortSignal): Promise<Uint8Array> {
  const res = await fetch(url, { headers: { Range: `bytes=${start}-${start + length - 1}` }, signal })
  if (!res.ok || !res.body) throw new Error(`fetchBytes: ${url} respondió ${res.status}`)
  if (start > 0 && res.status !== 206) {
    void res.body.cancel()
    throw new Error(`fetchBytes: ${url} ignoró el Range (respondió ${res.status})`)
  }

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (total < length) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.length
  }
  void reader.cancel()

  const bytes = new Uint8Array(Math.min(total, length))
  let offset = 0
  for (const chunk of chunks) {
    const slice = chunk.subarray(0, bytes.length - offset)
    bytes.set(slice, offset)
    offset += slice.length
    if (offset >= bytes.length) break
  }
  return bytes
}

async function fetchMp4DurationMs(url: string, head: Uint8Array, signal: AbortSignal): Promise<number | null> {
  let result = scanMp4TopLevel(head, 0)
  for (let i = 0; i < MAX_MP4_FETCHES && result && 'nextOffset' in result; i++) {
    const offset = result.nextOffset
    result = scanMp4TopLevel(await fetchBytes(url, offset, MOOV_PROBE_BYTES, signal), offset)
  }
  return result && 'durationMs' in result ? result.durationMs : null
}

export async function fetchVideoDurationMs(url: string): Promise<number> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const head = await fetchBytes(url, 0, HEADER_BYTES, controller.signal)
    const durationMs = isMp4(head) ? await fetchMp4DurationMs(url, head, controller.signal) : parseWebmDurationMs(head)
    if (durationMs === null) throw new Error(`fetchVideoDurationMs: no se pudo leer la duración de ${url}`)
    return durationMs
  } finally {
    clearTimeout(timeout)
  }
}
