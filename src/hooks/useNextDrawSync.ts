import { useEffect } from 'react'
import { fetchGameInfo } from '../api/gameInfo'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { parseApiDateTime } from '../utils/time'

// Próxima ronda de Roulette (número + hora) para vistas FUERA del lobby -- hoy el panel Next
// Results del Admin (RouletteNextResultPanel). Misma fuente que el lobby (/gameInfo -> nextDraw, en
// el mismo useGameConfigStore), pero sin el ciclo de video de App.tsx que la reagenda en cada
// ronda: acá se vuelve a pedir apenas pasa la hora del sorteo, y se reintenta hasta que el backend
// agende la siguiente (lo hace recién al liquidar la actual, unos segundos después del sorteo).
const AFTER_DRAW_DELAY_MS = 1_000
const RETRY_UNTIL_NEXT_MS = 2_000
// Red de seguridad por si cambia el horario desde el admin (o se pierde un pedido).
const SAFETY_REFRESH_MS = 30_000

export function useNextDrawSync() {
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    function schedule(ms: number) {
      clearTimeout(timer)
      timer = setTimeout(sync, ms)
    }

    async function sync() {
      try {
        const data = await fetchGameInfo()
        if (cancelled) return
        useGameConfigStore.getState().setGameConfig({
          drawNumber: data.nextDraw.drawNo,
          nextDrawStartTime: data.nextDraw.startTime,
          betsCloseTime: data.nextDraw.betsCloseTime ?? '',
          roundIntervalMs: data.roundInterval * 1000,
        })
        const untilDrawMs = parseApiDateTime(data.nextDraw.startTime).getTime() - Date.now()
        // Ya pasó y el backend todavía no agendó la siguiente: reintenta corto. Si no, vuelve a
        // pedir justo después del sorteo (o antes, por la red de seguridad).
        schedule(untilDrawMs <= 0 ? RETRY_UNTIL_NEXT_MS : Math.min(untilDrawMs + AFTER_DRAW_DELAY_MS, SAFETY_REFRESH_MS))
      } catch (err) {
        if (cancelled) return
        console.error('No se pudo obtener /gameInfo', err)
        schedule(RETRY_UNTIL_NEXT_MS)
      }
    }

    void sync()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])
}
