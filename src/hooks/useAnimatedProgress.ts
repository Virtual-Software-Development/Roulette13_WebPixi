import { useRef, useState } from 'react'
import { useTick } from '@pixi/react'

// Pixi Ticker clampea deltaMS a 100ms por tick (minFPS interno = 10, ver
// node_modules/pixi.js/lib/ticker/Ticker.mjs) para que la lógica de juego no "salte" de golpe
// si la pestaña estuvo en background. Ese mismo clamp arruina animaciones de UI cortas (500-900ms)
// bajo CPU throttling agresivo: si un frame tarda de verdad 300ms en procesarse, Pixi le reporta a
// este hook solo 100ms, así que la transición avanza menos de lo real y termina sintiéndose 2-3x
// más lenta (confirmado: bajo 4x slowdown de Chrome DevTools). Por eso este hook mide su propio
// elapsed con performance.now() en vez de confiar en ticker.deltaMS -- sigue enganchado al ticker
// de Pixi solo para saber CUÁNDO re-evaluar (useTick), no para la magnitud del paso.
const MAX_STEP_MS = 250

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
  // null mientras está en reposo (progress === target) -- evita que el primer tick al retomar
  // cuente todo el tiempo idle como "elapsed" de golpe.
  const lastTimeRef = useRef<number | null>(null)
  const [, forceRender] = useState(0)

  useTick(() => {
    if (progressRef.current === target) {
      lastTimeRef.current = null
      return
    }

    const now = performance.now()
    const elapsedMs = lastTimeRef.current === null ? 0 : Math.min(now - lastTimeRef.current, MAX_STEP_MS)
    lastTimeRef.current = now

    const step = elapsedMs / durationMs
    progressRef.current = target === 1
      ? Math.min(progressRef.current + step, 1)
      : Math.max(progressRef.current - step, 0)

    forceRender((n) => n + 1)
  })

  return progressRef.current
}
