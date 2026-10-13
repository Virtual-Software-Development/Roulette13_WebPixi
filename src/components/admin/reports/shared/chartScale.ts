// Escala "linda" (pasos 1, 2, 2.5, 5 × 10^n) que incluye min y max, ~4-5 divisiones.
export function niceTicks(rawMin: number, rawMax: number, targetSteps = 4): { min: number; max: number; ticks: number[]; step: number } {
  const span = rawMax - rawMin || Math.abs(rawMax) || 1
  const rough = span / targetSteps
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude
  const min = Math.floor(rawMin / step) * step
  const max = Math.max(Math.ceil(rawMax / step) * step, min + step)
  const ticks: number[] = []
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Number(v.toFixed(6)))
  return { min, max, ticks, step }
}
