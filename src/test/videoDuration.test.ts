import { describe, expect, it } from 'vitest'
import { parseWebmDurationMs, scanMp4TopLevel } from '../video/videoDuration'

function float64Bytes(value: number): number[] {
  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, value)
  return Array.from(new Uint8Array(view.buffer))
}

// Mismo orden que los .webm de la librería (encabezado EBML, Segment de tamaño desconocido, Void,
// Info con TimecodeScale + Duration) -- armado a mano para no depender de local-media en los tests.
function buildWebmHeader(info: number[]): Uint8Array {
  return new Uint8Array([
    0x1a, 0x45, 0xdf, 0xa3, 0x80, // EBML, vacío
    0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, // Segment, tamaño desconocido
    0xec, 0x82, 0x00, 0x00, // Void de 2 bytes
    0x15, 0x49, 0xa9, 0x66, 0x80 | info.length, ...info,
  ])
}

describe('parseWebmDurationMs', () => {
  it('lee Duration con el TimecodeScale por defecto (ms)', () => {
    const bytes = buildWebmHeader([0x44, 0x89, 0x88, ...float64Bytes(18004)])
    expect(parseWebmDurationMs(bytes)).toBe(18004)
  })

  it('aplica un TimecodeScale explícito', () => {
    // 100µs por tick -> 180040 ticks = 18004ms
    const bytes = buildWebmHeader([0x2a, 0xd7, 0xb1, 0x83, 0x01, 0x86, 0xa0, 0x44, 0x89, 0x88, ...float64Bytes(180040)])
    expect(parseWebmDurationMs(bytes)).toBeCloseTo(18004)
  })

  it('devuelve null si Info no trae Duration', () => {
    const bytes = buildWebmHeader([0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40])
    expect(parseWebmDurationMs(bytes)).toBeNull()
  })

  it('devuelve null si no es un webm', () => {
    expect(parseWebmDurationMs(new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]))).toBeNull()
  })

  it('devuelve null si el encabezado viene cortado', () => {
    const bytes = buildWebmHeader([0x44, 0x89, 0x88, ...float64Bytes(18004)])
    expect(parseWebmDurationMs(bytes.subarray(0, bytes.length - 3))).toBeNull()
  })
})

function u32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]
}

function box(type: string, body: number[]): number[] {
  return [...u32(8 + body.length), ...Array.from(type, (c) => c.charCodeAt(0)), ...body]
}

// mvhd version 0: version+flags, creation, modification, timescale, duration (+ resto sin usar).
function mvhd(timescale: number, duration: number): number[] {
  return box('mvhd', [0, 0, 0, 0, ...u32(0), ...u32(0), ...u32(timescale), ...u32(duration), ...new Array(80).fill(0)])
}

// Mismo orden que los MP4 de Videos/SORTED (no faststart): ftyp, free, mdat, moov al final.
const MDAT_SIZE = 4_000_000
const ftyp = box('ftyp', Array.from('isom\0\0\x02\0', (c) => c.charCodeAt(0)))
const free = box('free', [])
const mdatHeader = [...u32(MDAT_SIZE), ...Array.from('mdat', (c) => c.charCodeAt(0))]
const head = new Uint8Array([...ftyp, ...free, ...mdatHeader])
const moovOffset = ftyp.length + free.length + MDAT_SIZE

describe('scanMp4TopLevel', () => {
  it('con el moov al final, devuelve el offset donde empieza (después del mdat)', () => {
    expect(scanMp4TopLevel(head, 0)).toEqual({ nextOffset: moovOffset })
  })

  it('lee la duración del mvhd del moov', () => {
    const moov = new Uint8Array(box('moov', mvhd(1000, 18367)))
    expect(scanMp4TopLevel(moov, moovOffset)).toEqual({ durationMs: 18367 })
  })

  it('lee el moov al principio (faststart) en el primer tramo', () => {
    const bytes = new Uint8Array([...ftyp, ...box('moov', mvhd(600, 11_020)), ...mdatHeader])
    const result = scanMp4TopLevel(bytes, 0)
    expect(result && 'durationMs' in result ? result.durationMs : null).toBeCloseTo(18366.67, 1)
  })

  it('devuelve null si no empieza con ftyp', () => {
    expect(scanMp4TopLevel(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x80, 0, 0, 0]), 0)).toBeNull()
  })

  it('devuelve null si el moov no trae mvhd', () => {
    expect(scanMp4TopLevel(new Uint8Array(box('moov', box('trak', []))), moovOffset)).toBeNull()
  })
})
