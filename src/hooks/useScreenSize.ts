import { useEffect, useState } from 'react'
import type { Application } from 'pixi.js'
import { useApplication } from '@pixi/react'

export interface ScreenSize {
  width: number
  height: number
}

function readScreenSize(app: Application): ScreenSize {
  return {
    width: app.screen?.width ?? 0,
    height: app.screen?.height ?? 0,
  }
}

export function useScreenSize(): ScreenSize {
  const { app } = useApplication()
  const [size, setSize] = useState(() => readScreenSize(app))

  useEffect(() => {
    function handleResize() {
      requestAnimationFrame(() => setSize(readScreenSize(app)))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [app])

  return size
}
