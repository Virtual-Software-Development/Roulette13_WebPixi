import { useRef, useState } from 'react'
import { useTick } from '@pixi/react'

/**
 * Anima un progreso 0..1 hacia `target` a lo largo de `durationMs`, re-renderizando
 * en cada tick mientras no haya llegado. Arranca siempre en 0 (reposo) sin importar
 * el valor inicial de `target`, y puede revertirse en cualquier momento cambiando
 * `target` de 1 a 0 (o viceversa) — retoma la animación desde donde haya quedado.
 */
export function useAnimatedProgress(target: 0 | 1, durationMs: number): number {
  const progressRef = useRef(0)
  const [, forceRender] = useState(0)

  useTick((ticker) => {
    if (progressRef.current === target) return

    const step = ticker.deltaMS / durationMs
    progressRef.current = target === 1
      ? Math.min(progressRef.current + step, 1)
      : Math.max(progressRef.current - step, 0)

    forceRender((n) => n + 1)
  })

  return progressRef.current
}
