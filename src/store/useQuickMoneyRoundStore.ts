import { create } from 'zustand'
import { QUICK_MONEY_LOBBY_DRAWS } from '../data/quickMoneyLobbyMockData'
import type { CurrentEvent } from '../api/terminalTicket'

// Ciclo de ronda de Quick Money. Un solo sorteo produce el Pick 3 y el Pick 4 a la vez (mismo
// drawNumber/nextDrawTime para los dos).
//
// Dos fuentes:
// - Real (live = true): la página de apuestas (QuickMoneyBettingView) lo sincroniza con el sorteo
//   abierto del backend vía useQuickMoneyEventSync -- eventId, drawNumber, nextDrawTime y
//   betsCloseTime salen de GET /api/events/lottery/current, y las apuestas se bloquean desde el
//   cierre (ver useQuickMoneyRoundPhase).
// - Mock (live = false): el lobby (App.tsx) y el admin todavía no leen sorteos reales -- ahí corre
//   el reloj local de siempre (advanceRound), y en el lobby useQuickMoneyLobbyCycle pisa
//   nextDrawTime (ver config/quickMoneyLobbyCycle.ts).
const ROUND_DURATION_SECONDS = 300

// Consecutivo a partir del último sorteo del mock (quickMoneyLobbyMockData.ts), así la tabla de
// Winning Numbers del lobby compartido sigue una numeración coherente (antes era aleatorio).
export function nextDrawNumber(previous: string): string {
  return String((Number(previous) + 1) % 10000).padStart(4, '0')
}

function nextDrawIso(): string {
  return new Date(Date.now() + ROUND_DURATION_SECONDS * 1000).toISOString()
}

interface QuickMoneyRoundState {
  nextDrawTime: string
  drawNumber: string
  // Solo con live: el sorteo abierto del backend (null = ninguno abierto ahora) y su cierre de
  // apuestas.
  live: boolean
  eventId: number | null
  betsCloseTime: string
  // Mock: se llama cuando el countdown llega a 0 -- genera el próximo drawNumber y reprograma.
  advanceRound: () => void
  setLiveEvent: (event: CurrentEvent | null) => void
}

export const useQuickMoneyRoundStore = create<QuickMoneyRoundState>((set) => ({
  nextDrawTime: nextDrawIso(),
  drawNumber: nextDrawNumber(QUICK_MONEY_LOBBY_DRAWS[0].gameNumber),
  live: false,
  eventId: null,
  betsCloseTime: '',

  advanceRound: () => set((state) => ({ nextDrawTime: nextDrawIso(), drawNumber: nextDrawNumber(state.drawNumber) })),
  setLiveEvent: (event) =>
    set(
      event
        ? {
            live: true,
            eventId: event.id,
            drawNumber: event.numeroEvento,
            nextDrawTime: event.horaProgramada,
            betsCloseTime: event.horaCierreApuestas,
          }
        : { live: true, eventId: null, betsCloseTime: '' },
    ),
}))
