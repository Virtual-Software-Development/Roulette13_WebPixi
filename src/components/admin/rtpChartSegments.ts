export interface ChartPoint {
  x: number
  y: number
}

// Tramos continuos de una serie con huecos (días sin apuestas = null). Un tramo de un solo punto
// no se ve como línea: quien dibuja lo marca con un círculo.
export function lineSegments(values: (number | null)[], xFor: (index: number) => number, yFor: (value: number) => number): ChartPoint[][] {
  const segments: ChartPoint[][] = []
  let current: ChartPoint[] = []
  values.forEach((value, i) => {
    if (value === null) {
      if (current.length) segments.push(current)
      current = []
      return
    }
    current.push({ x: xFor(i), y: yFor(value) })
  })
  if (current.length) segments.push(current)
  return segments
}

export function polylinePoints(segment: ChartPoint[]): string {
  return segment.map((p) => `${p.x},${p.y}`).join(' ')
}
