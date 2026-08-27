// src/utils/rouletteColors.ts

export type RouletteColor = 'red' | 'black' | 'green'

const RED_NUMBERS = new Set<number>([ 1, 3, 5, 7, 9,11 ])

export function getRouletteColor(number: number): RouletteColor {
  if (number === 0) {
    return 'green'
  }

  if (RED_NUMBERS.has(number)) {
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