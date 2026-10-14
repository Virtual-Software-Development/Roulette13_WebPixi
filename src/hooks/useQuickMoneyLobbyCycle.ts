import { useEffect } from 'react'
import { useLobbyModeStore } from '../store/useLobbyModeStore'
import { nextDrawNumber, useQuickMoneyRoundStore } from '../store/useQuickMoneyRoundStore'
import { useQuickMoneyDrawsStore } from '../store/useQuickMoneyDrawsStore'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useLobbySyncStore } from '../store/useLobbySyncStore'
import { parseApiDateTime } from '../utils/time'
import { serverNow } from '../time/serverClock'
import { QUICK_MONEY_RESULT_OFFSET_MS, quickMoneyDrawAtMs } from '../sync/lobbyTimeline'
import { quickMoneyDigitsFor, quickMoneyFallbackDigits } from '../sync/quickMoneyHistory'
import { prepareQuickMoneyDraw, takePreparedDraw } from '../video/quickMoneyTestVideo'
import {
  FALLBACK_ROULETTE_ROUND_MS,
  QUICK_MONEY_DRAW_AT_REMAINING_MS,
  QUICK_MONEY_DRAW_LEAD_MS,
  QUICK_MONEY_SPLIT_TRANSITION_MS,
  QUICK_MONEY_VIDEO_BUDGET_MS,
  QUICK_MONEY_VIDEO_REQUEST_LEAD_MS,
  ROULETTE_FOCUS_MS,
} from '../config/quickMoneyLobbyCycle'

const CHECK_INTERVAL_MS = 250
// El bloque termina cuando al round de Roulette le queda esto -- la transición de salida arranca
// acá, así a ROULETTE_FOCUS_MS la pantalla ya es 100% Roulette.
const BLOCK_EXIT_AT_MS = ROULETTE_FOCUS_MS + QUICK_MONEY_SPLIT_TRANSITION_MS
// El split entra cuando al round de Roulette le queda esto (countdown de QUICK_MONEY_DRAW_LEAD_MS).
const BLOCK_ENTER_AT_MS = QUICK_MONEY_DRAW_AT_REMAINING_MS + QUICK_MONEY_DRAW_LEAD_MS
// Mínimo de bloque para entrar solo a mostrar el resultado (sin sorteo nuevo), ver más abajo.
const RESULT_ONLY_MIN_MS = 5_000

function toIso(ms: number): string {
  return new Date(ms).toISOString()
}

function currentRouletteDrawAtMs(): number {
  const nextDrawStartTime = useGameConfigStore.getState().nextDrawStartTime
  return nextDrawStartTime ? parseApiDateTime(nextDrawStartTime).getTime() : serverNow()
}

function roundIntervalMs(): number {
  return useGameConfigStore.getState().roundIntervalMs || FALLBACK_ROULETTE_ROUND_MS
}

// Publica el sorteo pendiente en la tabla y deja el countdown apuntando al sorteo de Quick Money del
// round siguiente (estimado con roundInterval; se corrige al entrar ese bloque). También lo usa
// QuickMoneyVideoView al terminar su video.
export function publishPendingDraw(rouletteDrawAtMs: number = currentRouletteDrawAtMs()) {
  const { pendingDraw, setPendingDraw, setPendingVideoUrl } = useLobbyModeStore.getState()
  if (!pendingDraw) return
  useQuickMoneyDrawsStore.getState().addDraw(pendingDraw)
  setPendingDraw(null)
  setPendingVideoUrl(null)
  useQuickMoneyRoundStore.setState({
    nextDrawTime: toIso(quickMoneyDrawAtMs(rouletteDrawAtMs) + roundIntervalMs()),
  })
}

// Máquina de fases del lobby compartido (ver config/quickMoneyLobbyCycle.ts), anclada al reloj de
// Roulette y al reloj del servidor (time/serverClock.ts), así todas las máquinas cambian de fase a la
// vez. Un solo polling liviano leyendo los stores con getState() -- se monta en un componente que
// devuelve null (QuickMoneyLobbyCycle) para que los cambios de fase no re-rendericen App entero.
//
// Cada sorteo de Quick Money se numera con el drawNo del round de Roulette al que pertenece y sus
// números son los del job de video COMPARTIDO del backend (o, sin backend, con semilla en ese drawNo):
// mismo sorteo en todas las máquinas. quickMoneyVideo -> quickMoneyResult lo dispara
// QuickMoneyVideoView a una hora absoluta; este hook solo lo corta si el bloque se queda sin tiempo.
export function useQuickMoneyLobbyCycle() {
  useEffect(() => {
    // Un bloque por round: se identifica el round por su hora de sorteo (cambia recién cuando App
    // reagenda el siguiente, ver handleRoundEnded).
    let lastBlockRound: string | null = null
    // Esta máquina llegó tarde al video de Quick Money (arrancó a mitad del video, o sin tiempo para
    // descargarlo): "Sincronizando…" y entra directo al resultado cuando el video termina en las demás.
    let deferredResultAt: number | null = null

    const interval = setInterval(() => {
      const nextDrawStartTime = useGameConfigStore.getState().nextDrawStartTime
      if (!nextDrawStartTime) return
      const rouletteDrawAtMs = parseApiDateTime(nextDrawStartTime).getTime()
      const now = serverNow()
      const remainingMs = rouletteDrawAtMs - now
      const blockRemainingMs = remainingMs - BLOCK_EXIT_AT_MS
      const thisRoundDrawAtMs = quickMoneyDrawAtMs(rouletteDrawAtMs)

      // Pedido anticipado del video (números aleatorios del backend) para el próximo sorteo de Quick
      // Money que todavía no se jugó: el de este round, o si ya pasó, el del siguiente (estimado).
      // prepareQuickMoneyDraw es idempotente por sorteo.
      const upcomingDrawAtMs =
        lastBlockRound !== nextDrawStartTime && thisRoundDrawAtMs > now ? thisRoundDrawAtMs : thisRoundDrawAtMs + roundIntervalMs()
      if (upcomingDrawAtMs - now <= QUICK_MONEY_VIDEO_REQUEST_LEAD_MS) {
        prepareQuickMoneyDraw(upcomingDrawAtMs)
      }

      const lobby = useLobbyModeStore.getState()
      const { active, lobbyInfoVisible } = useDrawCycleStore.getState()

      if (deferredResultAt !== null) {
        if (now < deferredResultAt && blockRemainingMs > 0) return
        deferredResultAt = null
        publishPendingDraw(rouletteDrawAtMs)
        lobby.setPhase(blockRemainingMs > 0 ? 'quickMoneyResult' : 'roulette')
        return
      }

      if (lobby.phase === 'roulette') {
        // Entra a mitad del round (BLOCK_ENTER_AT_MS), nunca durante un sorteo de Roulette.
        if (!lobbyInfoVisible || active || lastBlockRound === nextDrawStartTime) return
        if (remainingMs > BLOCK_ENTER_AT_MS || blockRemainingMs <= 0) return
        lastBlockRound = nextDrawStartTime
        const drawNumber = useGameConfigStore.getState().drawNumber
        if (thisRoundDrawAtMs <= now) {
          // El sorteo de este round ya pasó (la máquina arrancó a mitad del bloque).
          const publishAt = thisRoundDrawAtMs + QUICK_MONEY_RESULT_OFFSET_MS
          useQuickMoneyRoundStore.setState({
            nextDrawTime: toIso(thisRoundDrawAtMs + roundIntervalMs()),
            drawNumber: nextDrawNumber(drawNumber),
          })
          if (now < publishAt) {
            // Las demás están mostrando su video: no se salta al medio, se espera a que termine.
            useLobbySyncStore.getState().holdUntil(publishAt)
            deferredResultAt = publishAt
            void quickMoneyDigitsFor(thisRoundDrawAtMs, drawNumber).then((digits) => {
              useLobbyModeStore.getState().setPendingDraw({
                gameNumber: drawNumber,
                drawnAt: toIso(thisRoundDrawAtMs),
                pick3Result: digits.pick3,
                pick4Result: digits.pick4,
              })
            })
            return
          }
          // Ya publicado (la tabla lo trae desde el arranque, ver seedQuickMoneyDraws): directo al
          // resultado. Con menos de RESULT_ONLY_MIN_MS no vale la pena (entraría y saldría casi en la
          // misma transición).
          if (blockRemainingMs < RESULT_ONLY_MIN_MS) return
          lobby.setPhase('quickMoneyResult')
          return
        }
        useQuickMoneyRoundStore.setState({ nextDrawTime: toIso(thisRoundDrawAtMs), drawNumber })
        lobby.setPhase('quickMoneySplit')
        return
      }

      // Fin del bloque: vuelve a Roulette pase lo que pase (si el video siguiera, se corta y el
      // resultado se publica igual).
      if (blockRemainingMs <= 0) {
        publishPendingDraw(rouletteDrawAtMs)
        lobby.setPhase('roulette')
        return
      }

      if (lobby.phase !== 'quickMoneySplit') return

      const { nextDrawTime, drawNumber } = useQuickMoneyRoundStore.getState()
      const drawAtMs = new Date(nextDrawTime).getTime()
      if (lobby.pendingDraw || drawAtMs > now) return

      // Llegó la hora del sorteo de Quick Money: los números del job compartido del backend (o con
      // semilla si el backend no respondió), pendientes hasta que termine su video.
      const prepared = takePreparedDraw(drawAtMs)
      if (!prepared) console.warn('[quickMoneyLobbyCycle] sin números del backend para este sorteo -- se usan los de respaldo, sin video')
      const digits = prepared ?? quickMoneyFallbackDigits(drawNumber)
      lobby.setPendingDraw({
        gameNumber: drawNumber,
        // La hora programada, no `now`: es el ancla del video (QuickMoneyVideoView) y la hora que
        // muestra la tabla, igual en todas las máquinas.
        drawnAt: toIso(drawAtMs),
        pick3Result: digits.pick3,
        pick4Result: digits.pick4,
      })
      useQuickMoneyRoundStore.setState({ nextDrawTime: toIso(drawAtMs + roundIntervalMs()), drawNumber: nextDrawNumber(drawNumber) })

      // Con números del backend entra a la fase de video aunque el video no haya llegado a tiempo:
      // QuickMoneyVideoView muestra entonces VideoErrorPanel con el resultado durante lo que habría
      // durado el video. Sin números del backend o sin tiempo en el bloque, resultado directo.
      if (prepared && blockRemainingMs >= QUICK_MONEY_VIDEO_BUDGET_MS) {
        // Esta máquina arrancó tarde para descargar el video (~70 MB) pero el backend sí lo generó:
        // las demás lo están mostrando, así que se espera con "Sincronizando…" en vez del panel de
        // video no disponible.
        const bootedLate = useLobbySyncStore.getState().bootAtMs > drawAtMs - QUICK_MONEY_VIDEO_REQUEST_LEAD_MS
        if (!prepared.videoUrl && !prepared.failed && bootedLate) {
          deferredResultAt = drawAtMs + QUICK_MONEY_RESULT_OFFSET_MS
          useLobbySyncStore.getState().holdUntil(deferredResultAt)
          return
        }
        if (!prepared.videoUrl) console.warn('[quickMoneyLobbyCycle] el video no llegó a tiempo -- se muestra el panel de video no disponible')
        lobby.setPendingVideoUrl(prepared.videoUrl)
        lobby.setPhase('quickMoneyVideo')
      } else {
        if (prepared && !prepared.videoUrl) console.warn('[quickMoneyLobbyCycle] el video no llegó a tiempo -- resultado sin video')
        publishPendingDraw(rouletteDrawAtMs)
        lobby.setPhase('quickMoneyResult')
      }
    }, CHECK_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [])
}

export function QuickMoneyLobbyCycle() {
  useQuickMoneyLobbyCycle()
  return null
}
