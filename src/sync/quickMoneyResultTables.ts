import { fetchQuickMoneyPaytable, fetchQuickMoneyResultsOfDay } from '../api/roundHistory'
import type { QuickMoneyLobbyDraw } from '../data/quickMoneyLobbyMockData'
import { useQuickMoneyResultTablesStore, type DrawsTable } from '../store/useQuickMoneyResultTablesStore'
import { serverNow } from '../time/serverClock'
import { buildQuickMoneyDraws } from './quickMoneyHistory'

// Carga de las tablas del panel Winning Numbers / Fast Payments del lobby compartido:
//   - al montar el lobby, al cambiar el día (hora del servidor) y al publicarse cada sorteo de Quick
//     Money (onQuickMoneyDrawPublished);
//   - si el backend falla, reintenta cada RETRY_MS hasta que responda; si responde sin datos, no.
// El backend decide qué es "hoy" y "ayer" (fecha del round_code, hora de Santo Domingo); acá el día
// solo se calcula para saber cuándo cambió.

const RETRY_MS = 60_000
const DAY_CHECK_MS = 30_000
// Santo Domingo: UTC-4 fijo, sin horario de verano (igual que santoDomingo en el backend).
const SANTO_DOMINGO_OFFSET_MS = -4 * 60 * 60_000

// Día calendario (YYYY-MM-DD) de nowMs en Santo Domingo.
export function serverDayKey(nowMs: number): string {
  return new Date(nowMs + SANTO_DOMINGO_OFFSET_MS).toISOString().slice(0, 10)
}

type TableKey = 'today' | 'yesterday' | 'paytable'

const retryTimers: Partial<Record<TableKey, ReturnType<typeof setTimeout>>> = {}
// Una carga más nueva descarta la respuesta de una anterior que llegue tarde.
const loadSeq: Record<TableKey, number> = { today: 0, yesterday: 0, paytable: 0 }

function scheduleRetry(key: TableKey, load: () => void) {
  clearTimeout(retryTimers[key])
  retryTimers[key] = setTimeout(load, RETRY_MS)
}

// publishedOnly: solo los sorteos que las demás máquinas ya publicaron (terminó su video). Recién
// publicado un sorteo no hace falta: todo sorteo ya liquidado está publicado.
function loadDraws(key: 'today' | 'yesterday', publishedOnly = true) {
  clearTimeout(retryTimers[key])
  const seq = ++loadSeq[key]
  const nowMs = serverNow()
  const dayKey = serverDayKey(key === 'today' ? nowMs : nowMs - 24 * 60 * 60_000)
  fetchQuickMoneyResultsOfDay(key === 'today' ? 'today' : 'previous-day')
    .then((entries) => {
      if (seq !== loadSeq[key]) return
      const draws = buildQuickMoneyDraws(entries, publishedOnly ? serverNow() : Number.POSITIVE_INFINITY)
      useQuickMoneyResultTablesStore.setState({ [key]: { status: 'ready', dayKey, draws } satisfies DrawsTable })
    })
    .catch((err) => {
      if (seq !== loadSeq[key]) return
      console.error(`[quickMoneyResultTables] no se pudo leer la tabla ${key}`, err)
      const previous = useQuickMoneyResultTablesStore.getState()[key]
      // Lo cargado antes sigue sirviendo si es del mismo día; si cambió el día, se vacía.
      const draws = previous.dayKey === dayKey ? previous.draws : []
      useQuickMoneyResultTablesStore.setState({ [key]: { status: 'error', dayKey: previous.dayKey, draws } satisfies DrawsTable })
      scheduleRetry(key, () => loadDraws(key))
    })
}

function loadPaytable() {
  clearTimeout(retryTimers.paytable)
  const seq = ++loadSeq.paytable
  fetchQuickMoneyPaytable()
    .then((rows) => {
      if (seq !== loadSeq.paytable) return
      useQuickMoneyResultTablesStore.setState({ paytable: { status: 'ready', rows } })
    })
    .catch((err) => {
      if (seq !== loadSeq.paytable) return
      console.error('[quickMoneyResultTables] no se pudo leer la tabla de pagos', err)
      useQuickMoneyResultTablesStore.setState((state) => ({ paytable: { status: 'error', rows: state.paytable.rows } }))
      scheduleRetry('paytable', loadPaytable)
    })
}

function reloadAll(publishedOnly = true) {
  loadDraws('today', publishedOnly)
  loadDraws('yesterday')
  loadPaytable()
}

// Al publicarse un sorteo de Quick Money (useQuickMoneyLobbyCycle: publishPendingDraw): entra ya en
// la mitad de hoy -- así su fila aparece con el pop aunque el backend tarde -- y se recargan las tres
// tablas por seguridad.
export function onQuickMoneyDrawPublished(draw: QuickMoneyLobbyDraw) {
  const { today } = useQuickMoneyResultTablesStore.getState()
  const isToday = serverDayKey(new Date(draw.drawnAt).getTime()) === serverDayKey(serverNow())
  if (isToday && !today.draws.some((d) => d.gameNumber === draw.gameNumber)) {
    useQuickMoneyResultTablesStore.setState({ today: { ...today, draws: [draw, ...today.draws] } })
  }
  reloadAll(false)
}

// Lo monta QuickMoneySplitOverlay. Devuelve el cleanup.
export function startQuickMoneyResultTables(): () => void {
  let dayKey = serverDayKey(serverNow())
  reloadAll()
  const dayTimer = setInterval(() => {
    const current = serverDayKey(serverNow())
    if (current === dayKey) return
    dayKey = current
    reloadAll()
  }, DAY_CHECK_MS)
  return () => {
    clearInterval(dayTimer)
    for (const key of Object.keys(retryTimers) as TableKey[]) clearTimeout(retryTimers[key])
  }
}
