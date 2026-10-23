// GET /roulette/last-results (quick-money-backend, público) -- las últimas 100 rondas de ruleta ya
// liquidadas, de la más reciente a la más vieja (vista vw_roulette_last_results). Alimenta el pop-up
// "View Full History" del lobby (ver RoundHistoryModal.tsx).
export interface RouletteRoundHistoryEntry {
  numeroEvento: string
  fecha: string
  horaProgramada: string
  // Número ganador crudo de la API: 37 representa '00' (ver utils/rouletteColors.ts: toWheelPocket).
  resultadoEjecutado: number | null
}

export async function fetchRouletteRoundHistory(signal?: AbortSignal): Promise<RouletteRoundHistoryEntry[]> {
  const res = await fetch('/api/roulette/last-results', { signal })
  if (!res.ok) throw new Error(`roulette/last-results request failed: ${res.status}`)
  return res.json()
}

// GET /lottery/last-results (público) -- los últimos sorteos de Quick Money ya liquidados, del más
// reciente al más viejo: los dígitos de Pick 3 y Pick 4 como texto ("079", "7067").
export interface QuickMoneyRoundHistoryEntry {
  numeroEvento: string
  fecha: string
  horaProgramada: string
  pick3: string | null
  pick4: string | null
}

export async function fetchQuickMoneyRoundHistory(signal?: AbortSignal): Promise<QuickMoneyRoundHistoryEntry[]> {
  const res = await fetch('/api/lottery/last-results', { signal })
  if (!res.ok) throw new Error(`lottery/last-results request failed: ${res.status}`)
  return res.json()
}

// GET /lottery/results/today y /lottery/results/previous-day (públicos) -- todos los sorteos de
// Quick Money ya liquidados de hoy / de ayer (fecha del servidor, la del round_code), del más
// reciente al más viejo. Misma forma que /lottery/last-results. Alimentan las dos mitades del panel
// Winning Numbers del lobby (sync/quickMoneyResultTables.ts).
export async function fetchQuickMoneyResultsOfDay(day: 'today' | 'previous-day'): Promise<QuickMoneyRoundHistoryEntry[]> {
  const res = await fetch(`/api/lottery/results/${day}`)
  if (!res.ok) throw new Error(`lottery/results/${day} request failed: ${res.status}`)
  return res.json()
}

// GET /lottery/paytable (público) -- la tabla Fast Payments del lobby: nombre de la fila ("1st",
// "Pale", "Pick 3"...) y lo que paga por unidad apostada, de las reglas de pago activas.
export interface QuickMoneyPaytableRow {
  nombre: string
  pago: number
}

export async function fetchQuickMoneyPaytable(): Promise<QuickMoneyPaytableRow[]> {
  const res = await fetch('/api/lottery/paytable')
  if (!res.ok) throw new Error(`lottery/paytable request failed: ${res.status}`)
  return res.json()
}
