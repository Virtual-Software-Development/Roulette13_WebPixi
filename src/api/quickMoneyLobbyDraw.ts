import { errorMessage } from './terminalTicket'

// GET /lottery/lobby-draw (quick-money-backend, público) -- el sorteo REAL de Quick Money que el
// lobby muestra a una hora de sorteo (la de su round, ver sync/quickMoneySchedule.ts), así que todas
// las máquinas piden el mismo round y muestran el mismo resultado -- también si un admin lo cambió en
// Next Results. Los números llegan recién cuando el sorteo se ejecutó (~2s antes de su hora).
export interface QuickMoneyLobbyDrawResponse {
  id: number
  numeroEvento: string
  horaProgramada: string
  estado: 'pending' | 'drawn' | 'failed'
  pick3?: string
  pick4?: string
}

// null si no hay ningún round de Quick Money a esa hora.
export async function fetchQuickMoneyLobbyDraw(drawAtMs: number): Promise<QuickMoneyLobbyDrawResponse | null> {
  const res = await fetch(`/api/lottery/lobby-draw?drawAt=${encodeURIComponent(new Date(drawAtMs).toISOString())}`, {
    cache: 'no-store',
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`lottery/lobby-draw request failed: ${await errorMessage(res)}`)
  return res.json()
}
