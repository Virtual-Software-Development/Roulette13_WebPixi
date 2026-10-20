// Recorrido del auto-scroll de WinningTicketsScreen, en FILAS (no px): así un resize -- que cambia el
// alto de fila -- no mueve la lista de lugar, y una página nueva de ganadores que llega a mitad del
// recorrido sigue desde la fila donde está ahora, sin salto.
//
// Un tramo va de fromRow a toRow (desplazamiento del borde superior, en filas) entre startMs y endMs,
// contados desde que se abrió la pantalla. Antes de startMs queda en fromRow; después de endMs, en toRow.
export interface ScrollSegment {
  fromRow: number
  toRow: number
  startMs: number
  endMs: number
}

// Duración mínima de un tramo que arranca durante la pausa final (llegó una página tarde): se ve
// pasar en vez de saltar, sin pasarse del final de la pantalla.
const LATE_SEGMENT_MIN_MS = 1_000

export function rowAt(segment: ScrollSegment | null, elapsedMs: number): number {
  if (!segment) return 0
  if (elapsedMs <= segment.startMs) return segment.fromRow
  if (elapsedMs >= segment.endMs) return segment.toRow
  return segment.fromRow + ((segment.toRow - segment.fromRow) * (elapsedMs - segment.startMs)) / (segment.endMs - segment.startMs)
}

// Tramo nuevo cuando cambia el largo de la lista o el tamaño: arranca en la fila actual (o al terminar
// la pausa inicial, si todavía no empezó) y llega a maxRow -- la última fila apoyada en el borde de
// abajo -- al empezar la pausa final. null si la lista entra entera sin scroll.
export function nextSegment(
  previous: ScrollSegment | null,
  elapsedMs: number,
  maxRow: number,
  holdMs: number,
  totalMs: number,
): ScrollSegment | null {
  if (maxRow <= 0) return null
  const fromRow = Math.min(rowAt(previous, elapsedMs), maxRow)
  const startMs = Math.max(elapsedMs, holdMs)
  const scrollEndMs = totalMs - holdMs
  const endMs = startMs < scrollEndMs ? scrollEndMs : Math.min(totalMs, startMs + LATE_SEGMENT_MIN_MS)
  return { fromRow, toRow: maxRow, startMs, endMs: Math.max(endMs, startMs + 1) }
}

// Filas que hay que tener en el DOM: las visibles ahora más las que van a entrar hasta aheadRow (la
// posición un poco más adelante en el tiempo, para que el compositor nunca llegue a una fila que
// React todavía no pintó), con overscan de margen a cada lado. [start, end).
export function renderRange(
  nowRow: number,
  aheadRow: number,
  visibleRows: number,
  count: number,
  overscan: number,
): [number, number] {
  const start = Math.max(0, Math.floor(Math.min(nowRow, aheadRow)) - overscan)
  const end = Math.min(count, Math.ceil(Math.max(nowRow, aheadRow) + visibleRows) + overscan)
  return [start, Math.max(start, end)]
}
