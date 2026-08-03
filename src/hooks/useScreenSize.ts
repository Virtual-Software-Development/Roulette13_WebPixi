import { useEffect, useState } from 'react'
import type { Application } from 'pixi.js'
import { useApplication } from '@pixi/react'

export interface ScreenSize {
  width: number
  height: number
}

function readScreenSize(app: Application, isInitialised: boolean): ScreenSize {
  if (!isInitialised) return { width: 0, height: 0 }

  return {
    width: app.screen?.width ?? 0,
    height: app.screen?.height ?? 0,
  }
}

export function useScreenSize(): ScreenSize {
  const { app, isInitialised } = useApplication()
  const [size, setSize] = useState(() => readScreenSize(app, isInitialised))

  useEffect(() => {
    function handleResize() {
      requestAnimationFrame(() => setSize(readScreenSize(app, isInitialised)))
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [app, isInitialised])

  return size
}
