import { useEffect, useState } from 'react'
import { Assets, Texture } from 'pixi.js'

export function useTexture(url: string): Texture | null {
  const [texture, setTexture] = useState<Texture | null>(null)

  useEffect(() => {
    if (!url) {
      setTexture(null)
      return
    }

    let cancelled = false

    Assets.load<Texture>(url).then((loaded) => {
      if (!cancelled) setTexture(loaded)
    })

    return () => {
      cancelled = true
    }
  }, [url])

  return texture
}
