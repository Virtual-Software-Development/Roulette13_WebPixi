import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'

// Escala (≤ 1) para que `contentRef` entre entero en el alto disponible de `containerRef` (su
// clientHeight menos su padding vertical) sin scroll -- mismo criterio "toda la composición a la
// vista" que useViewport para Pixi, pero para una pantalla DOM. Nunca agranda (máximo 1).
//
// Mide el alto natural del contenido con offsetHeight, que NO incluye el transform: scale() que se
// le aplica con el resultado -- así aplicar la escala no vuelve a disparar la medición (sin loop).
// ResizeObserver en los dos elementos: cubre resize de ventana y cambios de alto del contenido
// (fuentes que cargan tarde, datos, breakpoints).
//
// `disabledQuery`: media query en la que no se escala (devuelve 1) -- ahí la pantalla scrollea.
export function useFitToHeight(
  containerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  disabledQuery?: string
): number {
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return

    const mediaQuery = disabledQuery ? window.matchMedia(disabledQuery) : null

    const update = () => {
      if (mediaQuery?.matches) {
        setScale(1)
        return
      }
      const style = getComputedStyle(container)
      const available = container.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      const natural = content.offsetHeight
      setScale(natural > 0 && available > 0 ? Math.min(1, available / natural) : 1)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(container)
    observer.observe(content)
    mediaQuery?.addEventListener('change', update)
    return () => {
      observer.disconnect()
      mediaQuery?.removeEventListener('change', update)
    }
  }, [containerRef, contentRef, disabledQuery])

  return scale
}
