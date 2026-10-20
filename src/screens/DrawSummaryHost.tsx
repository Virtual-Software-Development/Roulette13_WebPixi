import { useEffect, useRef, useState } from 'react'
import { WinningTicketsScreen } from './WinningTicketsScreen'
import { fetchQuickMoneyDrawSummary, fetchRouletteDrawSummary } from '../api/drawSummary'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useResultsStore } from '../store/useResultsStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useLobbyModeStore } from '../store/useLobbyModeStore'
import { useQuickMoneyDrawsStore } from '../store/useQuickMoneyDrawsStore'
import { serverNow } from '../time/serverClock'
import { parseApiDateTime } from '../utils/time'
import { toWheelPocket } from '../utils/rouletteColors'
import { quickMoneyDrawAtMs, quickMoneySummaryWindow, rouletteSummaryWindow, type DrawSummaryWindow } from '../sync/lobbyTimeline'
import type { WinningTicketsDraw } from '../types/winningTickets'

const CHECK_INTERVAL_MS = 250
// Un sorteo de Quick Money de la tabla se toma como el de este round solo si su hora cae cerca del
// slot esperado (la tabla arranca con sorteos de relleno de otras horas, ver useQuickMoneyDrawsStore).
const QUICK_MONEY_SLOT_TOLERANCE_MS = 60_000

interface Candidate {
  // Identifica el sorteo: una vez mostrado (o saltado) no se vuelve a abrir.
  key: string
  window: DrawSummaryWindow
  load: () => Promise<WinningTicketsDraw>
}

// Qué sorteo toca resumir ahora mismo, o null. Lee los stores con getState() (sin suscribirse) desde
// el polling, igual que useQuickMoneyLobbyCycle, para no re-renderizar en cada cambio de estado.
function currentCandidate(now: number): Candidate | null {
  const nextDrawStartTime = useGameConfigStore.getState().nextDrawStartTime
  if (!nextDrawStartTime) return null
  const nextDrawMs = parseApiDateTime(nextDrawStartTime).getTime()
  const phase = useLobbyModeStore.getState().phase
  const { active, lobbyInfoVisible } = useDrawCycleStore.getState()
  if (active) return null

  if (phase === 'roulette' && lobbyInfoVisible) {
    const winner = useResultsStore.getState().currentWinner
    if (!winner) return null
    const window = rouletteSummaryWindow(winner.timestamp, nextDrawMs)
    if (!window || now < window.startMs || now >= window.endMs) return null
    const pocket = toWheelPocket(winner.winningNumber)
    return {
      key: `roulette-${winner.timestamp}-${winner.drawNumber}`,
      window,
      load: () => fetchRouletteDrawSummary(winner.drawNumber, String(pocket)),
    }
  }

  if (phase === 'quickMoneyResult') {
    const draw = useQuickMoneyDrawsStore.getState().draws[0]
    if (!draw) return null
    const drawMs = new Date(draw.drawnAt).getTime()
    if (Math.abs(drawMs - quickMoneyDrawAtMs(nextDrawMs)) > QUICK_MONEY_SLOT_TOLERANCE_MS) return null
    const window = quickMoneySummaryWindow(drawMs, nextDrawMs)
    if (!window || now < window.startMs || now >= window.endMs) return null
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
export function DrawSummaryHost() {
  const [shown, setShown] = useState<Shown | null>(null)
  const shownKeyRef = useRef<string | null>(null)
  const closedKeysRef = useRef(new Set<string>())

  useEffect(() => {
    let cancelled = false
    let loadingKey: string | null = null

    const interval = setInterval(() => {
      const now = serverNow()
      const candidate = currentCandidate(now)

      if (shownKeyRef.current && candidate?.key !== shownKeyRef.current) {
        shownKeyRef.current = null
        setShown(null)
      }
      if (!candidate || candidate.key === shownKeyRef.current) return
      if (closedKeysRef.current.has(candidate.key) || loadingKey === candidate.key) return

      loadingKey = candidate.key
      void candidate.load().then((draw) => {
        if (cancelled || loadingKey !== candidate.key) return
        loadingKey = null
        const remainingMs = candidate.window.endMs - serverNow()
        if (remainingMs <= 0) return
        shownKeyRef.current = candidate.key
        setShown({ key: candidate.key, draw, durationMs: remainingMs })
      })
    }, CHECK_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (!shown) return null
  return (
    <WinningTicketsScreen
      key={shown.key}
      draw={shown.draw}
      // Todavía no hay forma de saber qué tickets se vendieron en esta terminal (sin endpoint): ninguno.
      localTicketCodes={[]}
      durationMs={shown.durationMs}
      onDone={() => {
        closedKeysRef.current.add(shown.key)
        shownKeyRef.current = null
        setShown(null)
      }}
    />
  )
}
