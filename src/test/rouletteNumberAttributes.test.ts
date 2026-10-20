import { describe, expect, it } from 'vitest'
import { getRouletteNumberAttributes } from '../utils/rouletteNumberAttributes'

describe('getRouletteNumberAttributes', () => {
  it('0 and 00 are green and belong to no outside group', () => {
    for (const pocket of [0, '00'] as const) {
      expect(getRouletteNumberAttributes(pocket)).toEqual({ color: 'green', dozen: null, column: null, parity: null, range: null })
    }
  })

  it.each([
    [1, { color: 'red', dozen: 1, column: 1, parity: 'odd', range: 'low' }],
    [12, { color: 'red', dozen: 1, column: 3, parity: 'even', range: 'low' }],
    [13, { color: 'black', dozen: 2, column: 1, parity: 'odd', range: 'low' }],
    [18, { color: 'red', dozen: 2, column: 3, parity: 'even', range: 'low' }],
    [19, { color: 'red', dozen: 2, column: 1, parity: 'odd', range: 'high' }],
    [24, { color: 'black', dozen: 2, column: 3, parity: 'even', range: 'high' }],
    [25, { color: 'red', dozen: 3, column: 1, parity: 'odd', range: 'high' }],
    [35, { color: 'black', dozen: 3, column: 2, parity: 'odd', range: 'high' }],
    [36, { color: 'red', dozen: 3, column: 3, parity: 'even', range: 'high' }],
  ] as const)('%i', (pocket, expected) => {
    expect(getRouletteNumberAttributes(pocket)).toEqual(expected)
  })

  it('every number 1-36 falls in exactly one dozen, column, parity and range', () => {
    const dozens = { 1: 0, 2: 0, 3: 0 }
    const columns = { 1: 0, 2: 0, 3: 0 }
    for (let n = 1; n <= 36; n++) {
      const a = getRouletteNumberAttributes(n)
      dozens[a.dozen!]++
      columns[a.column!]++
    }
    expect(dozens).toEqual({ 1: 12, 2: 12, 3: 12 })
    expect(columns).toEqual({ 1: 12, 2: 12, 3: 12 })
  })
})
