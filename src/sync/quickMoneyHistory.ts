import { listLotteryTestVideos, type LotteryTestVideoJob } from '../api/lotteryTestVideo'
import type { QuickMoneyLobbyDraw } from '../data/quickMoneyLobbyMockData'
import { useQuickMoneyDrawsStore, QUICK_MONEY_MAX_DRAWS } from '../store/useQuickMoneyDrawsStore'
import { parseApiDateTime } from '../utils/time'
import { seededDigits } from '../utils/seededRandom'
import { QUICK_MONEY_RESULT_OFFSET_MS, quickMoneyDrawAtMs } from './lobbyTimeline'
import type { GameInfoResponse } from '../types/gameInfo'

// SOLO PRUEBAS -- números de Quick Money del lobby compartido (no hay todavía sorteos reales de
// lotería para el lobby, ver video/quickMoneyTestVideo.ts). Cada sorteo de Quick Money pertenece a un
// round de Roulette: se numera con el drawNo de ese round y se juega QUICK_MONEY_DRAW_AT_REMAINING_MS
// antes de su sorteo. Todo sale de datos compartidos (drawNo/horas del backend, jobs de video del
// backend o una semilla), así cualquier máquina arma la misma tabla aunque haya arrancado tarde.

// Mismo margen que el backend (internal/lotterytestvideo drawAtTolerance): las máquinas estiman la
// hora del sorteo con unos segundos de diferencia.
const SAME_DRAW_TOLERANCE_MS = 60_000

export interface QuickMoneyDigits {
  pick3: number[]
  pick4: number[]
}

function toDigits(value: string): number[] {
  return Array.from(value, Number)
}

// Sin job del backend (videos de prueba apagados o backend caído para todos): números con semilla
// en el drawNo, iguales en todas las máquinas.
export function quickMoneyFallbackDigits(drawNo: string): QuickMoneyDigits {
  return { pick3: seededDigits(`quickMoney:${drawNo}:pick3`, 3), pick4: seededDigits(`quickMoney:${drawNo}:pick4`, 4) }
}

function jobDigitsFor(jobs: LotteryTestVideoJob[], drawAtMs: number): QuickMoneyDigits | null {
  const job = jobs.find((j) => j.drawAt && Math.abs(new Date(j.drawAt).getTime() - drawAtMs) < SAME_DRAW_TOLERANCE_MS)
  return job ? { pick3: toDigits(job.pick3), pick4: toDigits(job.pick4) } : null
}

// Números del sorteo de Quick Money de drawAtMs que ya se jugó en las demás máquinas -- para una
// máquina que llegó tarde y no tiene el job preparado.
export async function quickMoneyDigitsFor(drawAtMs: number, drawNo: string): Promise<QuickMoneyDigits> {
  const jobs = await listLotteryTestVideos().catch(() => [])
  return jobDigitsFor(jobs, drawAtMs) ?? quickMoneyFallbackDigits(drawNo)
}

interface RouletteRound {
  drawNo: string
  rouletteDrawAtMs: number
}

// Tabla Winning Numbers a partir de los rounds de Roulette conocidos (más nuevo primero): solo los
// sorteos de Quick Money cuyo resultado ya se publicó en las demás máquinas (al terminar su video).
export function buildQuickMoneyDraws(rounds: RouletteRound[], jobs: LotteryTestVideoJob[], nowMs: number): QuickMoneyLobbyDraw[] {
  const draws: QuickMoneyLobbyDraw[] = []
  for (const round of rounds) {
    const drawAtMs = quickMoneyDrawAtMs(round.rouletteDrawAtMs)
    if (nowMs < drawAtMs + QUICK_MONEY_RESULT_OFFSET_MS) continue
    const digits = jobDigitsFor(jobs, drawAtMs) ?? quickMoneyFallbackDigits(round.drawNo)
    draws.push({
      gameNumber: round.drawNo,
      drawnAt: new Date(drawAtMs).toISOString(),
      pick3Result: digits.pick3,
      pick4Result: digits.pick4,
    })
    if (draws.length === QUICK_MONEY_MAX_DRAWS) break
  }
  return draws
}

// Al arrancar el lobby: tabla armada desde /gameInfo (próximo sorteo, último ejecutado e historial)
// y los jobs de video del backend.
export async function seedQuickMoneyDraws(data: GameInfoResponse, nowMs: number): Promise<void> {
  const rounds: RouletteRound[] = []
  const add = (drawNo: string, time: string) => {
    const rouletteDrawAtMs = parseApiDateTime(time).getTime()
    if (!rounds.some((r) => r.drawNo === drawNo && r.rouletteDrawAtMs === rouletteDrawAtMs)) rounds.push({ drawNo, rouletteDrawAtMs })
  }
  add(data.nextDraw.drawNo, data.nextDraw.startTime)
  if (data.lastDraw) add(data.lastDraw.drawNo, data.lastDraw.startTime)
  for (const draw of data.history) add(draw.drawNo, draw.time)
  rounds.sort((a, b) => b.rouletteDrawAtMs - a.rouletteDrawAtMs)

  const jobs = await listLotteryTestVideos().catch(() => [])
  const draws = buildQuickMoneyDraws(rounds, jobs, nowMs)
  if (draws.length > 0) useQuickMoneyDrawsStore.getState().setDraws(draws)
}
