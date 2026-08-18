import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../layout/layout.constants'
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
  const scale = Math.max(width / DESIGN_WIDTH, height / DESIGN_HEIGHT)
  const offsetX = (width - DESIGN_WIDTH * scale) / 2
  const offsetY = (height - DESIGN_HEIGHT * scale) / 2

  return {
    scale,
    offsetX,
    offsetY,
    visibleLeft: -offsetX / scale || 0,
    visibleTop: -offsetY / scale || 0,
    visibleRight: (width - offsetX) / scale,
    visibleBottom: (height - offsetY) / scale,
  }
}
