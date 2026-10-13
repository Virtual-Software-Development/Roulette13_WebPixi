// Aleatoriedad determinística para los mocks de Reports: misma semilla -> mismos números, así los
// reportes no cambian entre renders ni al volver a un período.

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

// Mezcla (finalizador de murmur3) varios enteros en una semilla: con la semilla cruda, valores
// consecutivos (días, rondas) daban primeros números casi iguales y aparecían tendencias falsas.
export function hashSeed(...values: number[]): number {
  let h = 0x9e3779b9
  for (const value of values) {
    h = Math.imul(h ^ value, 0x85ebca6b)
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
    h ^= h >>> 16
  }
  return h >>> 0
}

// Un número en [0, 1) a partir de una semilla, para decisiones sueltas.
export const hashUnit = (...values: number[]) => hashSeed(...values) / 4294967296

export function dayKey(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
}
