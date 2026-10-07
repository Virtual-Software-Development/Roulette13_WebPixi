import { describe, expect, it } from 'vitest'
import { parseWebmDurationMs } from '../video/videoDuration'

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
