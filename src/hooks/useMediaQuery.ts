import { useCallback, useSyncExternalStore } from 'react'

// Genérico -- true mientras la media query matchee, re-renderizando al cruzar el breakpoint (no en
// cada resize). Para layout del DOM (Admin); el canvas Pixi usa useScreenSize/useViewport.
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
