import { describe, expect, it } from 'vitest'
import { formatCompactMoney, formatMoney } from '../utils/moneyFormat'

describe('formatCompactMoney', () => {
  it.each([
    [0, '$0'],
    [950, '$950'],
    [1000, '$1K'],
    [1540, '$1.5K'],
    [50_000, '$50K'],
    [125_400, '$125.4K'],
    [999_950, '$1M'],
    [1_250_000, '$1.3M'],
    [12_000_000, '$12M'],
  ])('%d -> %s', (value, expected) => {
    expect(formatCompactMoney(value)).toBe(expected)
  })

  it('treats missing values as $0, like formatMoney', () => {
    expect(formatCompactMoney(undefined)).toBe('$0')
    expect(formatCompactMoney(Number.NaN)).toBe('$0')
  })

  it('leaves the exact formatter untouched', () => {
    expect(formatMoney(50_000)).toBe('$50,000')
  })
})
