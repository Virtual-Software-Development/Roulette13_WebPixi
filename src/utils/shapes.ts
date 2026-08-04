export const TIME_BOX_SLANT = 32

export function rightTrapezoidPoints(x: number, y: number, width: number, height: number, slant: number): number[] {
  return [x, y, x + width, y, x + width, y + height, x + slant, y + height]
}
