import { useRef, useState } from 'react'
import { useTick } from '@pixi/react'
import { easeOutCubic } from '../utils/easing'

// Mismo problema y mismo fix que useAnimatedProgress.ts (ver su comentario largo): Pixi Ticker
// clampea deltaMS a 100ms por tick, lo que estira animaciones bajo CPU throttling agresivo. Se
// mide con performance.now() en vez de confiar en ticker.deltaMS -- el ticker de Pixi sigue
// usándose solo para saber CUÁNDO re-evaluar (useTick), no para la magnitud del paso.
const MAX_STEP_MS = 250

/**
 * Interpola un número hacia `target` a lo largo de `durationMs` (count-up/count-down), en vez de
 * saltar directo al nuevo valor -- mismo patrón ref+useTick+forceRender que useAnimatedProgress,
 * pero interpolando un rango numérico arbitrario en vez de un progreso fijo 0..1. Cada vez que
 * `target` cambia a mitad de una transición anterior, arranca una nueva desde el valor actual (no
 * desde el target viejo), así una seguidilla de apuestas no se ve como saltos entrecortados.
 *
 * `isEnabled` (soportado nativamente por useTick) mantiene a este hook DESUSCRITO del ticker de
 * Pixi mientras no hay ninguna transición en curso -- ver el mismo comentario en usePulseScale.ts
 * (LobbyLiveBetsPanel monta ~50 instancias de este hook, una por celda, permanentemente).
 */
export function useAnimatedNumber(target: number, durationMs: number): number {
  const valueRef = useRef(target)
  const fromRef = useRef(target)
  const targetRef = useRef(target)
  const elapsedRef = useRef(durationMs)
  // null mientras está en reposo -- mismo criterio que useAnimatedProgress.lastTimeRef.
  const lastTimeRef = useRef<number | null>(null)
  const [, forceRender] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  if (targetRef.current !== target) {
    fromRef.current = valueRef.current
    targetRef.current = target
    elapsedRef.current = 0
    lastTimeRef.current = null
    if (!isAnimating) setIsAnimating(true)
  }

  useTick({
    isEnabled: isAnimating,
    callback: () => {
      const now = performance.now()
      const elapsedMs = lastTimeRef.current === null ? 0 : Math.min(now - lastTimeRef.current, MAX_STEP_MS)
      lastTimeRef.current = now

      elapsedRef.current = Math.min(elapsedRef.current + elapsedMs, durationMs)
      const t = easeOutCubic(elapsedRef.current / durationMs)
      valueRef.current = fromRef.current + (targetRef.current - fromRef.current) * t
      forceRender((n) => n + 1)
      if (elapsedRef.current >= durationMs) setIsAnimating(false)
    },
  })

  return valueRef.current
}
