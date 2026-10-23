import { useEffect } from 'react'
import type { CurrentEvent } from '../api/terminalTicket'
import { fetchQuickMoneyLobbyDraw } from '../api/quickMoneyLobbyDraw'
import { QUICK_MONEY_ANTEROOM_MS, ROULETTE_ANTEROOM_MS } from '../config/lobbyMode'
import { QUICK_MONEY_NUMBERS_WAIT_MS, QUICK_MONEY_VIDEO_REQUEST_LEAD_MS } from '../config/quickMoneyLobbyCycle'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useLobbyModeStore, type LobbyPhase } from '../store/useLobbyModeStore'
import { useQuickMoneyRoundStore } from '../store/useQuickMoneyRoundStore'
import { QUICK_MONEY_FORCED_TAIL_MS, lobbyViewAt } from '../sync/lobbyRotation'
import { QUICK_MONEY_RESULT_OFFSET_MS } from '../sync/lobbyTimeline'
import { latestSettledQuickMoneyDrawAtMs } from '../sync/quickMoneyHistory'
import { serverNow } from '../time/serverClock'
import { parseApiDateTime } from '../utils/time'
import { prepareQuickMoneyDraw, takePreparedDraw } from '../video/quickMoneyDrawVideo'
import { publishPendingDraw } from './useQuickMoneyLobbyCycle'
import { useQuickMoneyEventSync } from './useQuickMoneyEventSync'

// Máquina de fases del lobby compartido en modo 'rotation' (config/lobbyMode.ts) -- reemplaza a
// useQuickMoneyLobbyCycle. Cada tick pregunta a lobbyViewAt (sync/lobbyRotation.ts) qué vista toca
// con la hora del servidor y lleva la fase hasta ahí:
//   roulette -> 'roulette'; jackpot -> 'jackpot'; quickMoney -> 'quickMoneySplit' y, al llegar la
//   hora de su sorteo, 'quickMoneyVideo' -> 'quickMoneyResult' (como en el modo 'round': el video
//   lo arma QuickMoneyPiecesView y pasa a quickMoneyResult a una hora absoluta).
// Los sorteos de Roulette los sigue manejando App.tsx (video, panel Winner), igual que siempre.
//
// El backend anuncia el sorteo SIGUIENTE unos 2s antes de jugar el actual (/gameInfo y
// /events/lottery/current), así que el sorteo de cada antesala se retiene hasta jugarlo; si no, la
// vista fija se soltaría justo a la hora del sorteo.

const CHECK_INTERVAL_MS = 250

interface TrackedQuickMoneyDraw {
  drawAtMs: number
  event: CurrentEvent
}

// Sorteo abierto de Quick Money según el backend (undefined = todavía sin leer).
let openQuickMoneyEvent: CurrentEvent | null | undefined
// Sorteo de Quick Money cuya antesala ya empezó y todavía no se jugó.
let trackedQuickMoney: TrackedQuickMoneyDraw | null = null
// Último sorteo de Quick Money jugado en este lobby (o al que se sumó tarde): mantiene la vista fija
// durante su video y su resultado.
let activeQuickMoneyDrawAtMs: number | null = null
// Su fase de video arrancó sin los números (llegaban tarde): se siguen esperando, ver más abajo.
let lateDrawAtMs: number | null = null
// Sumándose tarde a ese sorteo: los números se piden una vez.
let joiningDrawAtMs: number | null = null
// Sorteo de Roulette cuya antesala ya empezó.
let trackedRouletteDrawMs: number | null = null

function toIso(ms: number): string {
  return new Date(ms).toISOString()
}

function isQuickMoneyPhase(phase: LobbyPhase): boolean {
  return phase === 'quickMoneySplit' || phase === 'quickMoneyVideo' || phase === 'quickMoneyResult'
}

// Lo que muestra el panel de Quick Money (useQuickMoneyRoundStore): el sorteo de la antesala hasta
// jugarlo, si no el que el backend tiene abierto.
function syncRoundStore() {
  if (!trackedQuickMoney && openQuickMoneyEvent === undefined) return
  const event = trackedQuickMoney?.event ?? openQuickMoneyEvent ?? null
  const state = useQuickMoneyRoundStore.getState()
  if (state.live && state.eventId === (event?.id ?? null) && (!event || state.nextDrawTime === event.horaProgramada)) return
  state.setLiveEvent(event)
}

// Una máquina que entra a la vista de Quick Money durante la secuencia de un sorteo ya jugado (al
// arrancar, o si la rotación la tenía en otra vista): durante el video, el panel de video no
// disponible con los números (QuickMoneyPiecesView), y después el resultado directo.
function joinPlayedDraw(drawAtMs: number, now: number) {
  const lobby = useLobbyModeStore.getState()
  activeQuickMoneyDrawAtMs = drawAtMs
  if (now >= drawAtMs + QUICK_MONEY_RESULT_OFFSET_MS) {
    lobby.setPhase('quickMoneyResult')
    return
  }
  if (joiningDrawAtMs === drawAtMs) return
  joiningDrawAtMs = drawAtMs
  void fetchQuickMoneyLobbyDraw(drawAtMs)
    .catch(() => null)
    .then((draw) => {
      joiningDrawAtMs = null
      const current = useLobbyModeStore.getState()
      if (isQuickMoneyPhase(current.phase) || current.pendingDraw) return
      if (draw?.estado !== 'drawn' || !draw.pick3 || !draw.pick4) {
        current.setPhase('quickMoneyResult')
        return
      }
      current.setPendingDraw({
        gameNumber: draw.numeroEvento,
        drawnAt: toIso(drawAtMs),
        pick3Result: Array.from(draw.pick3, Number),
        pick4Result: Array.from(draw.pick4, Number),
      })
      current.setPendingDrawAtMs(drawAtMs)
      current.setPhase('quickMoneyVideo')
    })
}

// Llegó la hora del sorteo de la antesala: el resultado real del backend, pendiente hasta que termina
// su video (igual que en el modo 'round').
function playTrackedDraw(tracked: TrackedQuickMoneyDraw, now: number) {
  const lobby = useLobbyModeStore.getState()
  const { drawAtMs } = tracked
  const taken = takePreparedDraw(drawAtMs)
  if (taken.status === 'waiting' && now < drawAtMs + QUICK_MONEY_NUMBERS_WAIT_MS) return

  trackedQuickMoney = null
  activeQuickMoneyDrawAtMs = drawAtMs
  lobby.setPendingDrawAtMs(drawAtMs)
  if (taken.status !== 'ready') {
    // Sin números todavía: el panel de video no disponible, que los revela si llegan a tiempo.
    console.warn('[lobbyRotationCycle] sin el resultado del backend a la hora del sorteo -- panel de video no disponible')
    lateDrawAtMs = taken.status === 'waiting' ? drawAtMs : null
  } else {
    lobby.setPendingDraw({
      gameNumber: taken.draw.drawNumber,
      drawnAt: toIso(drawAtMs),
      pick3Result: taken.draw.pick3,
      pick4Result: taken.draw.pick4,
    })
  }
  lobby.setPhase('quickMoneyVideo')
  syncRoundStore()
}

function tick() {
  const now = serverNow()

  // --- Horas de los sorteos ---
  const { nextDrawStartTime } = useGameConfigStore.getState()
  const nextRouletteMs = nextDrawStartTime ? parseApiDateTime(nextDrawStartTime).getTime() : null
  if (nextRouletteMs !== null && nextRouletteMs - now <= ROULETTE_ANTEROOM_MS) {
    trackedRouletteDrawMs = Math.max(trackedRouletteDrawMs ?? nextRouletteMs, nextRouletteMs)
  }
  const trackedRouletteAhead = trackedRouletteDrawMs !== null && trackedRouletteDrawMs > now
  const drawStartMs = useDrawCycleStore.getState().drawStartMs
  const lastRouletteMs = Math.max(drawStartMs ?? -Infinity, !trackedRouletteAhead ? (trackedRouletteDrawMs ?? -Infinity) : -Infinity)

  const open = openQuickMoneyEvent
  const openDrawMs = open ? parseApiDateTime(open.horaProgramada).getTime() : null
  if (open && openDrawMs !== null && openDrawMs !== activeQuickMoneyDrawAtMs && openDrawMs - now <= QUICK_MONEY_ANTEROOM_MS) {
    if (!trackedQuickMoney || trackedQuickMoney.event.id === open.id || openDrawMs < trackedQuickMoney.drawAtMs) {
      trackedQuickMoney = { drawAtMs: openDrawMs, event: open }
    }
  }
  syncRoundStore()
  const nextQuickMoneyMs = trackedQuickMoney?.drawAtMs ?? openDrawMs
  if (nextQuickMoneyMs !== null && nextQuickMoneyMs > now && nextQuickMoneyMs - now <= QUICK_MONEY_VIDEO_REQUEST_LEAD_MS) {
    prepareQuickMoneyDraw(nextQuickMoneyMs)
  }
  const seededMs = latestSettledQuickMoneyDrawAtMs()
  const lastQuickMoneyMs = Math.max(activeQuickMoneyDrawAtMs ?? -Infinity, seededMs ?? -Infinity)

  const target = lobbyViewAt(now, {
    nextRouletteDrawMs: trackedRouletteAhead ? trackedRouletteDrawMs : nextRouletteMs,
    lastRouletteDrawMs: Number.isFinite(lastRouletteMs) ? lastRouletteMs : null,
    nextQuickMoneyDrawMs: nextQuickMoneyMs,
    lastQuickMoneyDrawMs: Number.isFinite(lastQuickMoneyMs) ? lastQuickMoneyMs : null,
  })

  const lobby = useLobbyModeStore.getState()
  if (lobby.forced !== target.forced) lobby.setForced(target.forced)

  // --- Fuera de Quick Money ---
  if (target.view !== 'quickMoney') {
    if (isQuickMoneyPhase(lobby.phase)) {
      lateDrawAtMs = null
      publishPendingDraw()
    }
    if (lobby.phase !== target.view) lobby.setPhase(target.view)
    return
  }

  // --- Entrando a Quick Money ---
  if (!isQuickMoneyPhase(lobby.phase)) {
    const lastMs = Number.isFinite(lastQuickMoneyMs) ? lastQuickMoneyMs : null
    if (lastMs !== null && now >= lastMs && now < lastMs + QUICK_MONEY_FORCED_TAIL_MS) joinPlayedDraw(lastMs, now)
    else lobby.setPhase('quickMoneySplit')
    return
  }

  // Panel de video no disponible sin números: llegan tarde (el backend ejecutó tarde el sorteo).
  if (lobby.phase === 'quickMoneyVideo' && !lobby.pendingDraw && lateDrawAtMs !== null) {
    const late = takePreparedDraw(lateDrawAtMs)
    if (late.status === 'ready') {
      lobby.setPendingDraw({
        gameNumber: late.draw.drawNumber,
        drawnAt: toIso(lateDrawAtMs),
        pick3Result: late.draw.pick3,
        pick4Result: late.draw.pick4,
      })
      lateDrawAtMs = null
    } else if (late.status === 'unavailable') {
      lateDrawAtMs = null
    }
    return
  }

  if (lobby.phase === 'quickMoneySplit' && !lobby.pendingDraw && trackedQuickMoney && trackedQuickMoney.drawAtMs <= now) {
    playTrackedDraw(trackedQuickMoney, now)
  }
}

export function useLobbyRotationCycle() {
  useQuickMoneyEventSync((event) => {
    openQuickMoneyEvent = event
    syncRoundStore()
  })

  useEffect(() => {
    tick()
    const interval = setInterval(tick, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])
}

export function LobbyRotationCycle() {
  useLobbyRotationCycle()
  return null
}
