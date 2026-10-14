import { useEffect, type RefObject } from 'react'
import { useDrawCycleStore } from '../store/useDrawCycleStore'
import { serverNow } from '../time/serverClock'
import { RESULT_HOLD_END_OFFSET_MS, rotorPhaseMs } from '../sync/lobbyTimeline'
import { WHEEL_SPIN_DURATION_SEC } from '../layout/wheelGeometry.constants'

const SYNC_INTERVAL_MS = 5_000
// Debajo de esto no se corrige: el salto se notaría más que el desvío.
const MAX_DRIFT_MS = 100

// Mantiene el giro del rotor de la rueda del lobby (animación CSS lobby-wheel-spin) en la misma fase
// en todas las máquinas: la fase sale del reloj del servidor y del último sorteo
// (lobbyTimeline.rotorPhaseMs), no del momento en que cargó la página. Sobre el rotor ya se alinean
// los overlays (chips, highlights, diamantes, bola del último ganador) vía useWheelRotationSync.
// Mismo mecanismo que el freeze de LobbyBackgroundLayer: Animation.currentTime, no animation-delay.
export function useRotorServerSync(rotorRef: RefObject<HTMLElement | null>, frozenRef: RefObject<boolean>) {
  useEffect(() => {
    const periodMs = WHEEL_SPIN_DURATION_SEC * 1000

    const sync = () => {
      const rotor = rotorRef.current
      // Congelado detrás del video: lo maneja el freeze (ángulo 0) y se suelta a la misma hora en
      // todas las máquinas.
      if (!rotor || frozenRef.current) return
      const now = serverNow()
      const drawStartMs = useDrawCycleStore.getState().drawStartMs
      // Sorteo en curso (la rueda está subiendo o por congelarse): el ancla nueva todavía no llegó.
      if (drawStartMs !== null && now < drawStartMs + RESULT_HOLD_END_OFFSET_MS) return
      const animation = rotor.getAnimations()[0]
      if (!animation) return

      const target = rotorPhaseMs(now, drawStartMs, periodMs)
      const current = ((Number(animation.currentTime ?? 0) % periodMs) + periodMs) % periodMs
      const diff = Math.abs(current - target)
      if (Math.min(diff, periodMs - diff) <= MAX_DRIFT_MS) return
      // El rotor Y todo lo que gira con él (bolita del último ganador, chips, highlights, diamantes:
      // la misma @keyframes lobby-wheel-spin) en el mismo instante -- useWheelRotationSync los
      // alcanzaría recién en su próximo resync (hasta 1s), y mientras tanto la bolita se vería
      // fuera de su casilla.
      for (const spin of document.getAnimations()) {
        if (spin instanceof CSSAnimation && spin.animationName === 'lobby-wheel-spin') spin.currentTime = target
      }
    }

    sync()
    const interval = setInterval(sync, SYNC_INTERVAL_MS)
    // Recién llegado el ancla del primer /gameInfo (o un sorteo nuevo), sin esperar al intervalo.
    const unsubscribe = useDrawCycleStore.subscribe((state, prev) => {
      if (state.drawStartMs !== prev.drawStartMs) sync()
    })
    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [rotorRef, frozenRef])
}
