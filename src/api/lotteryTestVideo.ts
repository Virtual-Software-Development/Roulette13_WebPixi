// SOLO PRUEBAS -- video de Quick Money con números aleatorios que genera el backend
// (quick-money-backend internal/lotterytestvideo): no son el resultado de ningún evento real.
export interface LotteryTestVideoJob {
  id: string
  pick3: string
  pick4: string
  // Sorteo de Quick Money del lobby al que pertenece (ver requestLotteryTestVideo).
  drawAt?: string
  estado: 'generando' | 'listo' | 'fallido'
  error?: string
}

// Con drawAt, el backend devuelve el job que ya exista para ese sorteo (±60s): todas las máquinas
// muestran el mismo video y los mismos números, aunque lo pidan en momentos distintos.
export async function requestLotteryTestVideo(drawAtMs: number): Promise<LotteryTestVideoJob> {
  const res = await fetch('/api/lottery/test-videos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drawAt: new Date(drawAtMs).toISOString() }),
  })
  if (!res.ok) throw new Error(`lottery test video request failed: ${res.status}`)
  return res.json()
}

export async function fetchLotteryTestVideo(id: string): Promise<LotteryTestVideoJob> {
  const res = await fetch(`/api/lottery/test-videos/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(`lottery test video status failed: ${res.status}`)
  return res.json()
}

// Jobs recientes (más nuevo primero) -- los números de los sorteos ya jugados, para armar la tabla
// Winning Numbers igual en todas las máquinas.
export async function listLotteryTestVideos(): Promise<LotteryTestVideoJob[]> {
  const res = await fetch('/api/lottery/test-videos')
  if (!res.ok) throw new Error(`lottery test video list failed: ${res.status}`)
  return res.json()
}

export function lotteryTestVideoUrl(id: string): string {
  return `/api/lottery/test-videos/${encodeURIComponent(id)}/video`
}
