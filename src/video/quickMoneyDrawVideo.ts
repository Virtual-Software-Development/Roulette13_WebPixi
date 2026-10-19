import { fetchQuickMoneyLobbyDraw, quickMoneyLobbyDrawVideoUrl } from '../api/quickMoneyLobbyDraw'
import { useLobbyModeStore } from '../store/useLobbyModeStore'
import { preloadQuickMoneyVideo } from './videoElements'
import { serverNow } from '../time/serverClock'
import { DRAW_EXECUTION_LEAD_MS } from '../sync/lobbyTimeline'
import { QUICK_MONEY_VIDEO_WAIT_MS } from '../config/quickMoneyLobbyCycle'

// Prepara el próximo sorteo de Quick Money del lobby compartido con el sorteo REAL del backend
// (api/quickMoneyLobbyDraw.ts): el mismo round, los mismos números y el mismo video en todas las
// máquinas, también si un admin cambió el resultado. El backend ejecuta el sorteo ~2s antes de su
// hora: recién ahí se piden los números (antes no existen públicamente) y se descarga el video ENTERO
// (blob, ~70 MB -- un src HTTP solo garantiza la metadata, ver loadVideoSrc), que el backend ya
// renderizó con el resultado bloqueado y solo entrega después del sorteo.

const POLL_INTERVAL_MS = 1_000
// Hasta cuándo, pasada la hora del sorteo, se siguen esperando sus números: después de eso no hay
// sorteo que mostrar (backend caído, round fallido o fuera del slot del lobby).
const NUMBERS_WAIT_MS = 30_000
// Mismo margen que el backend (events.LobbyDrawTolerance): la hora del sorteo siguiente es una
// estimación del lobby.
const SAME_DRAW_TOLERANCE_MS = 60_000

interface PreparedDraw {
  drawAtMs: number
  status: 'waiting' | 'drawn' | 'unavailable'
  drawNumber: string
  pick3: number[]
  pick4: number[]
  videoUrl: string | null
  // El intento de video terminó (listo o falló): no hay nada más que esperar.
  videoSettled: boolean
  cancelled: boolean
}

export interface TakenDraw {
  drawNumber: string
  pick3: number[]
  pick4: number[]
  // null si el video no llegó a tiempo (o falló) -- el resultado se muestra igual, sin video.
  videoUrl: string | null
}

export type TakeResult = { status: 'waiting' } | { status: 'unavailable' } | { status: 'ready'; draw: TakenDraw }

let current: PreparedDraw | null = null
// Blob cargado hoy en el slot -- se revoca recién cuando otro lo reemplaza en el <video>.
let loadedBlobUrl: string | null = null

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
  const prep: PreparedDraw = {
    drawAtMs,
    status: 'waiting',
    drawNumber: '',
    pick3: [],
    pick4: [],
    videoUrl: null,
    videoSettled: false,
    cancelled: false,
  }
  current = prep
  run(prep).catch((err) => console.error('[quickMoneyDrawVideo] no se pudo preparar el sorteo de Quick Money', err))
}

async function run(prep: PreparedDraw) {
  // Antes de su ejecución el backend no tiene números que dar.
  while (serverNow() < prep.drawAtMs - DRAW_EXECUTION_LEAD_MS) {
    if (prep.cancelled) return
    await sleep(Math.min(POLL_INTERVAL_MS, prep.drawAtMs - DRAW_EXECUTION_LEAD_MS - serverNow()))
  }

  let id: number | null = null
  while (id === null) {
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
      id = draw.id
      console.log('[quickMoneyDrawVideo] sorteo', draw.numeroEvento, draw.pick3, draw.pick4)
    } else if (draw?.estado === 'failed' || serverNow() > prep.drawAtMs + NUMBERS_WAIT_MS) {
      console.warn('[quickMoneyDrawVideo] no hay sorteo de Quick Money para mostrar a esta hora', draw)
      prep.status = 'unavailable'
      prep.videoSettled = true
      return
    } else {
      await sleep(POLL_INTERVAL_MS)
    }
  }

  try {
    await loadVideo(prep, id)
  } finally {
    prep.videoSettled = true
  }
}

async function loadVideo(prep: PreparedDraw, id: number) {
  let blob: Blob | null = null
  while (!blob) {
    if (prep.cancelled) return
    if (serverNow() > prep.drawAtMs + QUICK_MONEY_VIDEO_WAIT_MS) {
      console.warn('[quickMoneyDrawVideo] el video no llegó a tiempo')
      return
    }
    const res = await fetch(quickMoneyLobbyDrawVideoUrl(id))
    if (res.ok) {
      blob = await res.blob()
    } else if (res.status === 409 || res.status === 404) {
      // Todavía no ejecutado, o el video todavía no está listo.
      await sleep(POLL_INTERVAL_MS)
    } else {
      throw new Error(`descarga del video falló: ${res.status}`)
    }
  }

  // No pisar el slot mientras todavía suena el video del sorteo anterior.
  while (useLobbyModeStore.getState().phase === 'quickMoneyVideo') {
    if (prep.cancelled) return
    await sleep(500)
  }
  if (prep.cancelled) return

  const url = URL.createObjectURL(blob)
  try {
    await preloadQuickMoneyVideo(url)
  } catch (err) {
    URL.revokeObjectURL(url)
    throw err
  }
  if (loadedBlobUrl) URL.revokeObjectURL(loadedBlobUrl)
  loadedBlobUrl = url
  if (prep.cancelled) return
  prep.videoUrl = url
  console.log('[quickMoneyDrawVideo] video listo y precargado', id)
}

// A la hora del sorteo: 'waiting' mientras sus números no llegaron (o, con mayWaitForVideo, mientras
// su video todavía se está bajando); 'unavailable' si no hay sorteo que mostrar; si no, entrega (y
// consume) el sorteo.
export function takePreparedDraw(drawAtMs: number, mayWaitForVideo: boolean): TakeResult {
  const prep = current
  if (!prep || !isSameDraw(prep, drawAtMs)) {
    prepareQuickMoneyDraw(drawAtMs)
    return { status: 'waiting' }
  }
  if (prep.status === 'waiting') return { status: 'waiting' }
  if (prep.status === 'drawn' && !prep.videoSettled && mayWaitForVideo) return { status: 'waiting' }

  current = null
  prep.cancelled = true
  if (prep.status === 'unavailable') return { status: 'unavailable' }
  return {
    status: 'ready',
    draw: { drawNumber: prep.drawNumber, pick3: prep.pick3, pick4: prep.pick4, videoUrl: prep.videoUrl },
  }
}
