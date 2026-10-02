// SOLO PRUEBAS -- video de Quick Money con números aleatorios que genera el backend
// (quick-money-backend internal/lotterytestvideo): no son el resultado de ningún evento real.
export interface LotteryTestVideoJob {
  id: string
  pick3: string
  pick4: string
  estado: 'generando' | 'listo' | 'fallido'
  error?: string
}

export async function requestLotteryTestVideo(): Promise<LotteryTestVideoJob> {
  const res = await fetch('/api/lottery/test-videos', { method: 'POST' })
  if (!res.ok) throw new Error(`lottery test video request failed: ${res.status}`)
  return res.json()
}

export async function fetchLotteryTestVideo(id: string): Promise<LotteryTestVideoJob> {
  const res = await fetch(`/api/lottery/test-videos/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(`lottery test video status failed: ${res.status}`)
  return res.json()
}

export function lotteryTestVideoUrl(id: string): string {
  return `/api/lottery/test-videos/${encodeURIComponent(id)}/video`
}
