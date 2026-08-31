import type { ColumnGroup } from '../types/numberIndicator'

// Columna tal como aparece en el paño de apuestas (grilla de 3x12) -- columna 1: 1,4,7...34;
// columna 2: 2,5,8...35; columna 3: 3,6,9...36. Puramente matemático (resto de dividir por 3),
// no depende del orden físico de los números en la rueda (ver wheelPositions.ts para eso).
const COLUMN_GROUP_REMAINDER: Record<ColumnGroup, number> = {
  firstColumn: 1,
  secondColumn: 2,
  thirdColumn: 0,
}

export function getColumnGroupPockets(group: ColumnGroup): number[] {
  const remainder = COLUMN_GROUP_REMAINDER[group]
  return Array.from({ length: 36 }, (_, i) => i + 1).filter((n) => n % 3 === remainder)
}
