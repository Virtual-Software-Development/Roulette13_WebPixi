import { FillGradient } from 'pixi.js'

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

export function createHorizontalGradient(colorStops: { offset: number; color: number }[]) {
  return new FillGradient({ start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 }, colorStops })
}

export function createVerticalGradient(colorStops: { offset: number; color: number }[]) {
  return new FillGradient({ start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 }, colorStops })
}
