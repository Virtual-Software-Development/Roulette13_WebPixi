import { useEffect, useRef, useState } from 'react'

// Igual que useAnimatedProgress (progreso 0..1 hacia `target` a lo largo de `durationMs`,
// arranca en 0 salvo startAtTarget), pero con requestAnimationFrame en vez de useTick de Pixi --
// para animaciones DOM/SVG puras que viven fuera del árbol de <Application> (no pueden usar
// useAnimatedProgress, que depende de ese contexto). Ver LastWinnerBallLayer.tsx.
export function useRafProgress(target: 0 | 1, durationMs: number, options?: { startAtTarget?: boolean }): number {
  const progressRef = useRef<number>(options?.startAtTarget ? target : 0)
  const [, forceRender] = useState(0)

  useEffect(() => {
    if (progressRef.current === target) return

    let rafId: number
    let lastTimestamp: number | null = null

    const tick = (timestamp: number) => {
      if (lastTimestamp === null) lastTimestamp = timestamp
      const deltaMs = timestamp - lastTimestamp
      lastTimestamp = timestamp

      const step = deltaMs / durationMs
      progressRef.current = target === 1
        ? Math.min(progressRef.current + step, 1)
        : Math.max(progressRef.current - step, 0)

      forceRender((n) => n + 1)

      if (progressRef.current !== target) {
        rafId = requestAnimationFrame(tick)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [target, durationMs])

  return progressRef.current
}
