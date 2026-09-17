import { useRef, useState } from 'react'
import { useTick } from '@pixi/react'

const PULSE_DURATION_MS = 380
// Extra de escala en el pico del pulso (1 + este valor) -- sutil, un "pop" perceptible sin que la
// celda invada visualmente a sus vecinas.
const PULSE_PEAK_BUMP = 0.14
// Mismo problema y mismo fix que useAnimatedProgress.ts (ver su comentario largo): Pixi Ticker
// clampea deltaMS a 100ms por tick, lo que estira animaciones cortas bajo CPU throttling agresivo
// -- acá el efecto es más chico en aislamiento (PULSE_DURATION_MS ya es corto), pero cualquier
// frame que sí se clampee (p.ej. si coincide con otro trabajo pesado del hilo principal) se nota
// proporcionalmente más en una ventana de 380ms que en una de 900ms. Se mide con performance.now()
// en vez de confiar en ticker.deltaMS -- el ticker de Pixi sigue usándose solo para saber CUÁNDO
// re-evaluar (useTick), no para la magnitud del paso.
const MAX_STEP_MS = 250

/**
 * Devuelve un factor de escala que sube y vuelve a 1 (un "pop" corto) cada vez que `value` aumenta
 * -- reemplaza al highlight sostenido (glow/tinte) como señal de "acá acaba de entrar una apuesta":
 * no se queda destacado, solo pulsa en el momento en que el monto sube. Si `value` baja o se
 * mantiene igual, no dispara nada.
 *
 * `isEnabled` (soportado nativamente por useTick) mantiene a este hook DESUSCRITO del ticker de
 * Pixi mientras no hay ningún pulso en curso -- LobbyLiveBetsPanel monta ~50 instancias de este
 * hook (una por celda) permanentemente, así que sin esto cada una quedaba enganchada al ticker
 * para siempre, ejecutando un chequeo de "ya terminé" 60 veces por segundo aunque nunca vuelva a
 * pulsar. Con isEnabled, solo las celdas que están efectivamente animando en este instante (casi
 * siempre ninguna, o unas pocas) están registradas en el ticker.
 */
export function usePulseScale(value: number): number {
  const prevValueRef = useRef(value)
  const elapsedRef = useRef(PULSE_DURATION_MS)
  const scaleRef = useRef(1)
  // null mientras está en reposo -- evita que el primer tick al retomar un pulso nuevo cuente todo
  // el tiempo idle desde el último pulso como "elapsed" de golpe (mismo criterio que
  // useAnimatedProgress.lastTimeRef).
  const lastTimeRef = useRef<number | null>(null)
  const [, forceRender] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  if (value > prevValueRef.current) {
    elapsedRef.current = 0
    lastTimeRef.current = null
    if (!isAnimating) setIsAnimating(true)
  }
  prevValueRef.current = value

  useTick({
    isEnabled: isAnimating,
    callback: () => {
      const now = performance.now()
      const elapsedMs = lastTimeRef.current === null ? 0 : Math.min(now - lastTimeRef.current, MAX_STEP_MS)
      lastTimeRef.current = now

      elapsedRef.current = Math.min(elapsedRef.current + elapsedMs, PULSE_DURATION_MS)
      const t = elapsedRef.current / PULSE_DURATION_MS
      scaleRef.current = 1 + Math.sin(t * Math.PI) * PULSE_PEAK_BUMP
      forceRender((n) => n + 1)
      if (elapsedRef.current >= PULSE_DURATION_MS) setIsAnimating(false)
    },
  })

  return scaleRef.current
}
