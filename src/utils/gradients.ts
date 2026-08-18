import { FillGradient } from 'pixi.js'
import type { TimeColor } from '../types/result'

export const GOLD_BORDER_WIDTH = 4

export const GOLD_BORDER_STOPS = [
  { offset: 0, color: 0xeedda6 },
  { offset: 0.5, color: 0xb27e3e },
  { offset: 1, color: 0xb79253 },
]

export const TIME_RED_TO_BLACK_STOPS = [
  { offset: 0, color: 0x860f10 },
  { offset: 1, color: 0x000006 },
]

export const DRAW_GRAY_TO_BLACK_STOPS = [
  { offset: 0, color: 0x393738 },
  { offset: 1, color: 0x000006 },
]

export const DRAW_BLACK_TO_RED_STOPS = [
  { offset: 0, color: 0x000006 },
  { offset: 1, color: 0x860f10 },
]

// Color del resplandor (GlowFilter) alrededor del chip del ganador "en vivo".
export const LIVE_HALO_COLOR = 0xc9a227

export function createHorizontalGradient(colorStops: { offset: number; color: number }[]) {
  return new FillGradient({ start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 }, colorStops })
}

export function createVerticalGradient(colorStops: { offset: number; color: number }[]) {
  return new FillGradient({ start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 }, colorStops })
}

export const TIME_COLOR_GRADIENTS: Record<TimeColor, FillGradient> = {
  red: createHorizontalGradient(TIME_RED_TO_BLACK_STOPS),
  black: createHorizontalGradient(DRAW_GRAY_TO_BLACK_STOPS),
}

export const DRAW_COLOR_GRADIENTS: Record<TimeColor, FillGradient> = {
  black: createHorizontalGradient(DRAW_GRAY_TO_BLACK_STOPS),
  red: createHorizontalGradient(DRAW_BLACK_TO_RED_STOPS),
}

export function getOppositeTimeColor(color: TimeColor): TimeColor {
  return color === 'red' ? 'black' : 'red'
}

export function pickRandomTimeColor(): TimeColor {
  return Math.random() < 0.5 ? 'red' : 'black'
}
