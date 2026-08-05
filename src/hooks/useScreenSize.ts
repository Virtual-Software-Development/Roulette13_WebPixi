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
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [app, isInitialised])

  return size
}
