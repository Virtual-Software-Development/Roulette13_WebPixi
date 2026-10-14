// Aleatorio DETERMINÍSTICO para datos de prueba que tienen que verse igual en todas las máquinas del
// lobby: misma semilla, misma secuencia (Math.random daría números distintos en cada kiosco).

// Hash de string a 32 bits (FNV-1a).
function hashSeed(seed: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

// mulberry32: generador chico y rápido, suficiente para mocks (no criptográfico).
export function seededRandom(seed: string): () => number {
  let state = hashSeed(seed)
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededDigits(seed: string, count: number): number[] {
  const random = seededRandom(seed)
  return Array.from({ length: count }, () => Math.floor(random() * 10))
}
