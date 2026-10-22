import { useEffect, useRef, useState } from 'react'
import { WinningTicketsScreen } from './WinningTicketsScreen'
import { fetchQuickMoneyDrawSummary, fetchRouletteDrawSummary } from '../api/drawSummary'
import { streamWinners, winnersSourceFor } from '../api/drawWinners'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useResultsStore } from '../store/useResultsStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useLobbyModeStore } from '../store/useLobbyModeStore'
import { useQuickMoneyDrawsStore } from '../store/useQuickMoneyDrawsStore'
import { serverNow } from '../time/serverClock'
import { parseApiDateTime } from '../utils/time'
import { toWheelPocket } from '../utils/rouletteColors'
import {
  DRAW_SUMMARY_PREFETCH_MS,
  quickMoneyDrawAtMs,
  quickMoneySummaryWindow,
  rouletteSummaryWindow,
  type DrawSummaryWindow,
} from '../sync/lobbyTimeline'
import { FALLBACK_ROULETTE_ROUND_MS } from '../config/quickMoneyLobbyCycle'
import type { WinningTicketsDraw } from '../types/winningTickets'

const CHECK_INTERVAL_MS = 250
// Un sorteo de Quick Money de la tabla se toma como el de este round solo si su hora cae cerca del
// slot esperado (la tabla arranca con sorteos de relleno de otras horas, ver useQuickMoneyDrawsStore).
const QUICK_MONEY_SLOT_TOLERANCE_MS = 60_000
// Lo mismo para Roulette: el último ganador se resume solo si es el sorteo del round que termina con
// nextDrawStartTime. Mientras corre el video del sorteo siguiente (/gameInfo ya anuncia el de
// después, y currentWinner sigue siendo el anterior hasta que termina el clip) quedan dos rounds de
// distancia y no se toma.
const ROULETTE_SLOT_TOLERANCE_MS = 60_000

interface Candidate {
  // Identifica el sorteo: una vez mostrado (o saltado) no se vuelve a abrir.
  key: string
  window: DrawSummaryWindow
  load: () => Promise<WinningTicketsDraw>
}

function inPrefetchOrWindow(now: number, window: DrawSummaryWindow | null): window is DrawSummaryWindow {
  return !!window && now >= window.startMs - DRAW_SUMMARY_PREFETCH_MS && now < window.endMs
}

// Qué sorteo toca resumir ahora mismo (o dentro de DRAW_SUMMARY_PREFETCH_MS, para tenerlo cargado al
// abrir), o null. Lee los stores con getState() (sin suscribirse) desde el polling, igual que
// useQuickMoneyLobbyCycle, para no re-renderizar en cada cambio de estado.
function currentCandidate(now: number): Candidate | null {
  const { nextDrawStartTime, roundIntervalMs } = useGameConfigStore.getState()
  if (!nextDrawStartTime) return null
  const nextDrawMs = parseApiDateTime(nextDrawStartTime).getTime()
  const phase = useLobbyModeStore.getState().phase

  // Sin mirar `active`: la ventana arranca al terminar el hold del panel Winner y se precarga
  // durante el hold, con el sorteo todavía activo (ver rouletteSummaryWindow).
  if (phase === 'roulette') {
    const winner = useResultsStore.getState().currentWinner
    if (!winner) return null
    const roundMs = roundIntervalMs > 0 ? roundIntervalMs : FALLBACK_ROULETTE_ROUND_MS
    if (nextDrawMs - winner.timestamp > roundMs + ROULETTE_SLOT_TOLERANCE_MS) return null
    const window = rouletteSummaryWindow(winner.timestamp, nextDrawMs)
    if (!inPrefetchOrWindow(now, window)) return null
    const pocket = toWheelPocket(winner.winningNumber)
    return {
      key: `roulette-${winner.timestamp}-${winner.drawNumber}`,
      window,
      load: () => fetchRouletteDrawSummary(winner.drawNumber, String(pocket)),
    }
  }

  // Durante el video el sorteo todavía no está publicado en la tabla (eso pasa tras el fade out, ver
  // QuickMoneyPiecesView): se toma el pendiente, que es el mismo sorteo (misma key).
  if (useDrawCycleStore.getState().active) return null
  if (phase === 'quickMoneyVideo' || phase === 'quickMoneyResult') {
    const draw = phase === 'quickMoneyVideo' ? useLobbyModeStore.getState().pendingDraw : useQuickMoneyDrawsStore.getState().draws[0]
    if (!draw) return null
    const drawMs = new Date(draw.drawnAt).getTime()
    if (Math.abs(drawMs - quickMoneyDrawAtMs(nextDrawMs)) > QUICK_MONEY_SLOT_TOLERANCE_MS) return null
    const window = quickMoneySummaryWindow(drawMs, nextDrawMs)
    if (!inPrefetchOrWindow(now, window)) return null
    return {
      key: `quickMoney-${drawMs}-${draw.gameNumber}`,
      window,
      load: () => fetchQuickMoneyDrawSummary(draw.gameNumber, draw.pick3Result.join(''), draw.pick4Result.join('')),
    }
  }

  return null
}

interface Shown {
  key: string
  draw: WinningTicketsDraw
  durationMs: number
}

// Monta la pantalla de resumen + ganadores (WinningTicketsScreen) en los huecos del ciclo del lobby
// después de cada sorteo de Roulette y de Quick Money (ver rouletteSummaryWindow /
// quickMoneySummaryWindow en sync/lobbyTimeline.ts). Abre y cierra a la hora del servidor, así que
// todas las máquinas la muestran juntas; una que arranca a mitad del hueco ve lo que queda. "Saltar"
// la cierra solo en esta máquina, y no vuelve a abrirse para ese sorteo.
// El resumen (y la primera página de ganadores, si hay de dónde leerla, api/drawWinners.ts) se pide
// DRAW_SUMMARY_PREFETCH_MS antes y la pantalla abre recién a la hora de la ventana: si se pidiera al
// abrir, entre la vuelta al lobby y la respuesta del backend se veía el lobby. Las páginas siguientes
// llegan con la pantalla ya abierta.
export function DrawSummaryHost() {
  const [shown, setShown] = useState<Shown | null>(null)
  const shownKeyRef = useRef<string | null>(null)
  const closedKeysRef = useRef(new Set<string>())
  // Corta la descarga de páginas de la pantalla que se cierra (o de la que se estaba precargando).
  const winnersAbortRef = useRef<AbortController | null>(null)

  function close() {
    winnersAbortRef.current?.abort()
    winnersAbortRef.current = null
    shownKeyRef.current = null
    setShown(null)
  }

  useEffect(() => {
    let cancelled = false
    // Sorteo que se está precargando (o esperando su hora), y el timer que lo abre.
    let loadingKey: string | null = null
    let revealTimer: ReturnType<typeof setTimeout> | undefined

    function cancelLoading() {
      clearTimeout(revealTimer)
      revealTimer = undefined
      loadingKey = null
      winnersAbortRef.current?.abort()
      winnersAbortRef.current = null
    }

    function prefetch(candidate: Candidate) {
      const { key, window } = candidate
      loadingKey = key
      let latest: WinningTicketsDraw | null = null
      let revealed = false

      const reveal = () => {
        revealTimer = undefined
        if (cancelled || loadingKey !== key || !latest) return
        loadingKey = null
        const remainingMs = window.endMs - serverNow()
        if (remainingMs <= 0) return
        revealed = true
        shownKeyRef.current = key
        setShown({ key, draw: latest, durationMs: remainingMs })
      }

      // Cada vez que hay datos nuevos: el resumen, o una página más de ganadores.
      const onData = (draw: WinningTicketsDraw) => {
        if (cancelled) return
        latest = draw
        if (revealed) {
          setShown((prev) => (prev?.key === key ? { ...prev, draw } : prev))
          return
        }
        if (loadingKey !== key || revealTimer !== undefined) return
        revealTimer = setTimeout(reveal, Math.max(0, window.startMs - serverNow()))
      }

      void candidate.load().then(
        (draw) => {
          if (cancelled || loadingKey !== key) return
          const source = winnersSourceFor(draw)
          if (!source) {
            onData(draw)
            return
          }
          const controller = new AbortController()
          winnersAbortRef.current = controller
          void streamWinners(draw, source, controller.signal, onData)
        },
        // loadingKey queda en este sorteo: no se reintenta cada CHECK_INTERVAL_MS (mismo criterio de
        // antes), y se libera solo cuando la ventana pasa.
        (err) => console.error('[drawSummary] no se pudo cargar el resumen del sorteo', err),
      )
    }

    const interval = setInterval(() => {
      const candidate = currentCandidate(serverNow())

      if (shownKeyRef.current && candidate?.key !== shownKeyRef.current) close()
      if (loadingKey && candidate?.key !== loadingKey) cancelLoading()
      if (!candidate || candidate.key === shownKeyRef.current || candidate.key === loadingKey) return
      if (closedKeysRef.current.has(candidate.key)) return
      prefetch(candidate)
    }, CHECK_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
      clearTimeout(revealTimer)
      winnersAbortRef.current?.abort()
    }
  }, [])

  if (!shown) return null
  return (
    <WinningTicketsScreen
      key={shown.key}
      draw={shown.draw}
      durationMs={shown.durationMs}
      onDone={() => {
        closedKeysRef.current.add(shown.key)
        close()
      }}
    />
  )
}
