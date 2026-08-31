import type { WheelPocket, WheelType } from '../types/wheel'

// Orden físico real de las casillas en sentido horario (no el orden numérico 0-36) --
// es el que determina en qué posición del video cae cada número al girar la ruleta.
export const EUROPEAN_WHEEL_ORDER: WheelPocket[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
]

export const AMERICAN_WHEEL_ORDER: WheelPocket[] = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, '00',
  27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2,
]

// Tipo de ruleta activo en el video del lobby -- fijo por ahora porque no existe ningún
// campo (RouletteResult, GameInfoDraw, etc.) que lo indique; cambiar acá hasta que exista
// una fuente real (config de mesa, backend, prop).
export const ACTIVE_WHEEL_TYPE: WheelType = 'american'

export function getWheelOrder(type: WheelType): WheelPocket[] {
  return type === 'american' ? AMERICAN_WHEEL_ORDER : EUROPEAN_WHEEL_ORDER
}
