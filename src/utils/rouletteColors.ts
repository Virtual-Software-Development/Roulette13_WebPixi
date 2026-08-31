// src/utils/rouletteColors.ts

import type { WheelPocket } from '../types/wheel'

export type RouletteColor = 'red' | 'black' | 'green'

const RED_NUMBERS = new Set<number>([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

export function getRouletteColor(pocket: WheelPocket): RouletteColor {
  if (pocket === '00' || pocket === 0) {
    return 'green'
  }

  if (RED_NUMBERS.has(pocket)) {
    return 'red'
  }

  return 'black'
}

// Color del texto del número ganador sobre el fondo oscuro de la lista —
// "black" se pinta blanco/claro porque un número casi-negro sería ilegible
// como texto (a diferencia de un fondo de pill, donde sí funcionaría oscuro).
export const ROULETTE_TEXT_COLOR_HEX: Record<RouletteColor, number> = {
  red: 0xff4d4d,
  black: 0xffffff,
  green: 0x4caf50,
}