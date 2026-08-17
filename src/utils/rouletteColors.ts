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

export const ROULETTE_COLOR_HEX: Record<RouletteColor, number> = {
  red: 0x8b1a1a,
  black: 0x1a1a1a,
  green: 0x4caf50,
}