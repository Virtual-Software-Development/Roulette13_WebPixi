import { DESIGN_HEIGHT, DESIGN_WIDTH, HEADER_BAR_HEIGHT_PX } from '../layout/layout.constants'
import { useScreenSize } from './useScreenSize'

export interface Viewport {
  scale: number
  offsetX: number
  offsetY: number
  // rectángulo, en unidades de diseño, que efectivamente queda visible en la
  // pantalla real tras el recorte de cover — los elementos anclados a un borde
  // (no centrados) deben referenciar estos límites en vez de DESIGN_WIDTH/HEIGHT
  // para que su padding se mida desde el borde real de pantalla y nunca se recorten.
  visibleLeft: number
  visibleTop: number
  visibleRight: number
  visibleBottom: number
}

export function useViewport(): Viewport {
  const { width, height } = useScreenSize()

  if (!width || !height) {
    return {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      visibleLeft: 0,
      visibleTop: 0,
      visibleRight: DESIGN_WIDTH,
      visibleBottom: DESIGN_HEIGHT,
    }
  }

  // cover: el canvas de diseño siempre llena la pantalla real por completo,
  // recortando el sobrante en el eje "suelto" en vez de dejar franjas negras.
  // El header vive fuera de Pixi (DOM, ver src/layout/Header.tsx) como una
  // franja fija de HEADER_BAR_HEIGHT_PX arriba de todo -- el cover-fit se
  // calcula contra el alto disponible DEBAJO de esa franja (usableHeight), y
  // el resultado se corre hacia abajo esa misma cantidad de px reales, para
  // que ningún contenido de Pixi quede tapado por el header.
  const usableHeight = Math.max(0, height - HEADER_BAR_HEIGHT_PX)
  const scale = Math.max(width / DESIGN_WIDTH, usableHeight / DESIGN_HEIGHT)
  const offsetX = (width - DESIGN_WIDTH * scale) / 2
  const offsetYWithinUsable = (usableHeight - DESIGN_HEIGHT * scale) / 2
  const offsetY = HEADER_BAR_HEIGHT_PX + offsetYWithinUsable

  return {
    scale,
    offsetX,
    offsetY,
    visibleLeft: -offsetX / scale || 0,
    visibleTop: -offsetYWithinUsable / scale || 0,
    visibleRight: (width - offsetX) / scale,
    visibleBottom: (usableHeight - offsetYWithinUsable) / scale,
  }
}
