import { fetchQuickMoneyLobbyDraw } from '../api/quickMoneyLobbyDraw'
import { serverNow } from '../time/serverClock'
import { DRAW_EXECUTION_LEAD_MS } from '../sync/lobbyTimeline'
import { QUICK_MONEY_VIDEO_DURATION_MS } from '../config/quickMoneyLobbyCycle'
import { loadPiecesManifest } from './quickMoneyPieces/plan'

// Prepara el próximo sorteo de Quick Money del lobby compartido con el sorteo REAL del backend
// (api/quickMoneyLobbyDraw.ts): el mismo round y los mismos números en todas las máquinas, también si
// un admin cambió el resultado. El backend ejecuta el sorteo ~2s antes de su hora: recién ahí se piden
// los números (antes no existen públicamente). Del backend solo salen los números: el video lo arma
// el navegador con las piezas de local-media/QuickMoney/ (QuickMoneyPiecesView), así que no hay nada
// que renderizar ni descargar por sorteo.

const POLL_INTERVAL_MS = 1_000
// Hasta cuándo, pasada la hora del sorteo, se siguen esperando sus números: hasta la hora en que el
// video los habría revelado. Mientras, el lobby muestra el panel de video no disponible (ver
// useQuickMoneyLobbyCycle), que los revela si llegan a tiempo; después no hay sorteo que mostrar
// (backend caído, round fallido o fuera del slot del lobby).
const NUMBERS_WAIT_MS = QUICK_MONEY_VIDEO_DURATION_MS
// Mismo margen que el backend (events.LobbyDrawTolerance): la hora del sorteo siguiente es una
// estimación del lobby.
const SAME_DRAW_TOLERANCE_MS = 60_000

interface PreparedDraw {
  drawAtMs: number
  status: 'waiting' | 'drawn' | 'unavailable'
  drawNumber: string
  pick3: number[]
  pick4: number[]
  cancelled: boolean
}

export interface TakenDraw {
  drawNumber: string
  pick3: number[]
  pick4: number[]
}

export type TakeResult = { status: 'waiting' } | { status: 'unavailable' } | { status: 'ready'; draw: TakenDraw }

let current: PreparedDraw | null = null

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toDigits(value: string): number[] {
  return Array.from(value, Number)
}

function isSameDraw(prep: PreparedDraw, drawAtMs: number): boolean {
  return Math.abs(prep.drawAtMs - drawAtMs) < SAME_DRAW_TOLERANCE_MS
}

// Idempotente por sorteo: llamarlo de nuevo para el mismo (o casi el mismo) drawAtMs no hace nada.
export function prepareQuickMoneyDraw(drawAtMs: number) {
  if (current) {
    if (isSameDraw(current, drawAtMs)) return
    current.cancelled = true
  }
  const prep: PreparedDraw = { drawAtMs, status: 'waiting', drawNumber: '', pick3: [], pick4: [], cancelled: false }
  current = prep
  // Se adelanta la lectura del manifiesto de las piezas: si faltan en local-media se ve acá en el
  // log, minutos antes del sorteo (la vista igual muestra el panel de video no disponible).
  loadPiecesManifest().catch((err) =>
    console.error('[quickMoneyDrawVideo] no están las piezas del video en local-media/QuickMoney (npm run quick-money-pieces)', err)
  )
  run(prep).catch((err) => console.error('[quickMoneyDrawVideo] no se pudo preparar el sorteo de Quick Money', err))
}

async function run(prep: PreparedDraw) {
  // Antes de su ejecución el backend no tiene números que dar.
  while (serverNow() < prep.drawAtMs - DRAW_EXECUTION_LEAD_MS) {
    if (prep.cancelled) return
    await sleep(Math.min(POLL_INTERVAL_MS, prep.drawAtMs - DRAW_EXECUTION_LEAD_MS - serverNow()))
  }

  for (;;) {
    if (prep.cancelled) return
    const draw = await fetchQuickMoneyLobbyDraw(prep.drawAtMs).catch((err) => {
      console.error('[quickMoneyDrawVideo] no se pudo leer el sorteo', err)
      return null
    })
    if (draw?.estado === 'drawn' && draw.pick3 && draw.pick4) {
      prep.drawNumber = draw.numeroEvento
      prep.pick3 = toDigits(draw.pick3)
      prep.pick4 = toDigits(draw.pick4)
      prep.status = 'drawn'
      console.log('[quickMoneyDrawVideo] sorteo', draw.numeroEvento, draw.pick3, draw.pick4)
      return
    }
    if (draw?.estado === 'failed' || serverNow() > prep.drawAtMs + NUMBERS_WAIT_MS) {
      console.warn('[quickMoneyDrawVideo] no hay sorteo de Quick Money para mostrar a esta hora', draw)
      prep.status = 'unavailable'
      return
    }
    await sleep(POLL_INTERVAL_MS)
  }
}

// A la hora del sorteo: 'waiting' mientras sus números no llegaron; 'unavailable' si no hay sorteo
// que mostrar; si no, entrega (y consume) el sorteo.
export function takePreparedDraw(drawAtMs: number): TakeResult {
  const prep = current
  if (!prep || !isSameDraw(prep, drawAtMs)) {
    prepareQuickMoneyDraw(drawAtMs)
    return { status: 'waiting' }
  }
  if (prep.status === 'waiting') return { status: 'waiting' }

  current = null
  prep.cancelled = true
  if (prep.status === 'unavailable') return { status: 'unavailable' }
  return { status: 'ready', draw: { drawNumber: prep.drawNumber, pick3: prep.pick3, pick4: prep.pick4 } }
}
