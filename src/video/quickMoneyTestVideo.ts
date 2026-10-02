import { fetchLotteryTestVideo, lotteryTestVideoUrl, requestLotteryTestVideo } from '../api/lotteryTestVideo'
import { useLobbyModeStore } from '../store/useLobbyModeStore'
import { preloadQuickMoneyVideo } from './videoElements'

// SOLO PRUEBAS -- prepara el próximo sorteo de Quick Money del lobby compartido: QUICK_MONEY_VIDEO_
// REQUEST_LEAD_MS antes del sorteo (ver useQuickMoneyLobbyCycle) le pide al backend números
// aleatorios + su video (sorteo-api), espera el render, descarga el MP4 ENTERO (blob, ~70 MB -- un
// src HTTP solo garantiza la metadata, ver loadVideoSrc) y lo deja cargado en el slot de Quick
// Money, así a la hora del sorteo arranca sin espera. Esos números son el resultado que se publica
// en el historial del split (useQuickMoneyDrawsStore).

const POLL_INTERVAL_MS = 2_000
// La hora del sorteo del round siguiente es una estimación (el backend agenda cada round recién al
// liquidar el anterior, unos segundos de corrimiento): dentro de esta tolerancia es el mismo sorteo.
const SAME_DRAW_TOLERANCE_MS = 60_000

interface PreparedDraw {
  drawAtMs: number
  pick3: number[] | null
  pick4: number[] | null
  videoUrl: string | null
  cancelled: boolean
}

export interface TakenDraw {
  pick3: number[]
  pick4: number[]
  // null si el video no llegó a tiempo (o falló) -- el resultado se publica igual, sin video.
  videoUrl: string | null
}

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
  const prep: PreparedDraw = { drawAtMs, pick3: null, pick4: null, videoUrl: null, cancelled: false }
  current = prep
  run(prep).catch((err) => console.error('[quickMoneyTestVideo] no se pudo preparar el video de Quick Money', err))
}

async function run(prep: PreparedDraw) {
  let job = await requestLotteryTestVideo()
  prep.pick3 = toDigits(job.pick3)
  prep.pick4 = toDigits(job.pick4)
  console.log('[quickMoneyTestVideo] pedido', job.id, job.pick3, job.pick4)

  while (job.estado === 'generando') {
    await sleep(POLL_INTERVAL_MS)
    // Pasada la hora del sorteo ya no sirve: el resultado salió sin video.
    if (prep.cancelled || Date.now() > prep.drawAtMs) return
    job = await fetchLotteryTestVideo(job.id)
  }
  if (job.estado !== 'listo') throw new Error(job.error ?? `estado ${job.estado}`)

  const res = await fetch(lotteryTestVideoUrl(job.id))
  if (!res.ok) throw new Error(`descarga del video falló: ${res.status}`)
  const blob = await res.blob()

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
  console.log('[quickMoneyTestVideo] listo y precargado', job.id)
}

// A la hora del sorteo: entrega (y consume) lo preparado para ESE sorteo, o null si nunca se pidió
// o el backend no respondió -- en ese caso el ciclo cae a números locales.
export function takePreparedDraw(drawAtMs: number): TakenDraw | null {
  const prep = current
  if (!prep || !isSameDraw(prep, drawAtMs)) return null
  current = null
  prep.cancelled = true
  if (!prep.pick3 || !prep.pick4) return null
  return { pick3: prep.pick3, pick4: prep.pick4, videoUrl: prep.videoUrl }
}
