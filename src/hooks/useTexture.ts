import { useEffect, useState } from 'react'
import { Assets, Texture } from 'pixi.js'

export interface TextureState {
  texture: Texture | null
  failed: boolean
}

export function useTexture(
  url: string,
  options?: { unloadOnChange?: boolean }
): TextureState {
  const [state, setState] = useState<TextureState>({ texture: null, failed: false })
  const unloadOnChange = options?.unloadOnChange ?? false

  useEffect(() => {
    if (!url) {
      setState({ texture: null, failed: false })
      return
    }

    let cancelled = false
    setState({ texture: null, failed: false })

    Assets.load<Texture>(url)
      .then((loaded) => {
        if (!cancelled) setState({ texture: loaded, failed: false })
      })
      .catch(() => {
        if (!cancelled) setState({ texture: null, failed: true })
      })

    return () => {
      cancelled = true
      if (unloadOnChange) {
        Assets.unload(url).catch(() => {})
      }
    }
  }, [url, unloadOnChange])

  return state
}
