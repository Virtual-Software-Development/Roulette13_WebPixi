import { create } from 'zustand'

const TICK_INTERVAL_MS = 200

interface ClockState {
  now: number
}

// Reloj compartido para useCountdown -- antes, cada llamada a useCountdown armaba su PROPIO
// setInterval(200ms) calculando lo mismo contra el mismo nextDrawStartTime (Header,
// NumberPanelHotCold, LobbyBackgroundLayer x2, SpinStatsPanel -- 5 timers independientes y
// desfasados, 5 árboles re-renderizando 5 veces por segundo). Con un solo `now` compartido acá,
// useCountdown pasa a ser un selector: zustand solo re-renderiza a cada consumidor cuando SU
// remainingSeconds entero realmente cambia (~1 vez por segundo), no en cada tick de 200ms.
export const useClockStore = create<ClockState>(() => ({ now: Date.now() }))

let started = false

// Arranca el único setInterval compartido la primera vez que algo lo necesita (ver useCountdown)
// -- así ningún entry point que nunca pida un countdown (tests, por ejemplo) hereda un timer de
// fondo corriendo para siempre.
export function ensureClockTicking(): void {
  if (started) return
  started = true
  setInterval(() => {
    useClockStore.setState({ now: Date.now() })
  }, TICK_INTERVAL_MS)
}
