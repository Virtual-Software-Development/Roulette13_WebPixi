import { useRef, useState } from 'react'
import { useTick } from '@pixi/react'

/**
 * Anima un progreso 0..1 hacia `target` a lo largo de `durationMs`, re-renderizando
 * en cada tick mientras no haya llegado. Por defecto arranca siempre en 0 (reposo) sin
 * importar el valor inicial de `target` -- así es como RouletteVideoView entra en
 * escena (arranca oculto en 0 y sube a 1 apenas active pasa a true al montar). Pasar
 * `startAtTarget: true` cuando el estado inicial no debe animarse desde 0 sino arrancar
 * ya en el valor de `target` del primer render (ver NumberPanelHotCold, que si cargó la
 * página a mitad de ronda no debe mostrarse ni un frame antes de ocultarse). Puede
 * revertirse en cualquier momento cambiando `target` de 1 a 0 (o viceversa) — retoma la
 * animación desde donde haya quedado.
 */
export function useAnimatedProgress(target: 0 | 1, durationMs: number, options?: { startAtTarget?: boolean }): number {
  const progressRef = useRef<number>(options?.startAtTarget ? target : 0)
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
