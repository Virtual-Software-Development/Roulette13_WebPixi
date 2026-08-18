import { useEffect, useState } from 'react'
import type { Application } from 'pixi.js'
import { useApplication } from '@pixi/react'
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../layout/layout.constants'

export interface ScreenSize {
  width: number
  height: number
}

function readScreenSize(app: Application, isInitialised: boolean): ScreenSize {
  if (!isInitialised) return { width: 0, height: 0 }

  return {
    width: app.screen?.width ?? DESIGN_WIDTH,
    height: app.screen?.height ?? DESIGN_HEIGHT,
  }
}

export function useScreenSize(): ScreenSize {
  const { app, isInitialised } = useApplication()
  const [size, setSize] = useState(() => readScreenSize(app, isInitialised))

  useEffect(() => {
    function handleResize() {
      setSize(readScreenSize(app, isInitialised));
    }

    handleResize()

    // Pixi's ResizePlugin also listens to window's 'resize' event, but defers
    // the actual renderer.resize() to the next requestAnimationFrame instead
    // of doing it synchronously. Listening to window's 'resize' directly here
    // would race that and read the stale pre-resize app.screen size. Pixi's
    // renderer emits its own 'resize' event right after it applies the real
    // resize (AbstractRenderer.resize()), so we listen to that instead.
    app?.renderer?.on('resize', handleResize)
    return () => {
      app?.renderer?.off('resize', handleResize)
    }
  }, [app, isInitialised])

  return size
}
