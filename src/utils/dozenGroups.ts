import type { DozenGroup } from '../types/numberIndicator'

const DOZEN_GROUP_RANGES: Record<DozenGroup, [number, number]> = {
  firstDozen: [1, 12],
  secondDozen: [13, 24],
  thirdDozen: [25, 36],
}

// La docena es puramente matemática (rangos fijos 1-12/13-24/25-36) -- no depende del orden
// físico de los números en la rueda (ver wheelPositions.ts para eso).
export function getDozenGroupPockets(group: DozenGroup): number[] {
  const [start, end] = DOZEN_GROUP_RANGES[group]
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}
