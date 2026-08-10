import type { DrawResultResponse } from '../types/drawResult'

export async function fetchDrawResult(drawNo: string): Promise<DrawResultResponse> {
  const res = await fetch(`/api/drawResult?drawNo=${encodeURIComponent(drawNo)}`)
  if (!res.ok) throw new Error(`drawResult request failed: ${res.status}`)
  const data: DrawResultResponse = await res.json()
  console.log('[drawResult]', data)
  return data
}
