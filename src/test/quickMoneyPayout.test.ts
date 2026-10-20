import { describe, expect, it } from 'vitest'
import { getBetDraw, getDirectoPrizes, getMaxMultiplier, getPrizeMultiplier } from '../utils/quickMoneyPayout'
import type { QuickMoneyBetSelection, QuickMoneyBetType } from '../types/quickMoneyBet'

// Mismas reglas que QuickMoneyPrizeCalc.GetMultiplierFromFormatNumberBets (script C# de referencia).
// Resultado de ejemplo: Pick 3 = 4-7-2, Pick 4 = 1-9-0-5 ->
//   Directo 1.º = "72" (últimos 2 del Pick 3), 2.º = "19", 3.º = "05".
const PICK3 = [4, 7, 2]
const PICK4 = [1, 9, 0, 5]

function bet(betType: QuickMoneyBetType, digits: string): QuickMoneyBetSelection {
  return { betType, digits: digits.split('').map(Number) }
}

const prize = (betType: QuickMoneyBetType, digits: string) => getPrizeMultiplier(bet(betType, digits), PICK3, PICK4)

describe('getPrizeMultiplier', () => {
  it('Single (1 digit) pays 9 if the digit appears in the Pick 3 result', () => {
    expect(prize('single', '7')).toBe(9)
    expect(prize('single', '4')).toBe(9)
    expect(prize('single', '9')).toBe(0) // only in Pick 4
  })

  it('Directo (2 digits) pays 56 / 12 / 4 for the 1st / 2nd / 3rd pair', () => {
    expect(prize('directo', '72')).toBe(56)
    expect(prize('directo', '19')).toBe(12)
    expect(prize('directo', '05')).toBe(4)
    expect(prize('directo', '27')).toBe(0)
  })

  it('Bolita (2 digits) pays 75 for the first or last two Pick 3 digits', () => {
    expect(prize('bolita', '47')).toBe(75)
    expect(prize('bolita', '72')).toBe(75)
    expect(prize('bolita', '42')).toBe(0)
  })

  it('3-digit Straight pays 600 only for the exact Pick 3', () => {
    expect(prize('straight', '472')).toBe(600)
    expect(prize('straight', '274')).toBe(0)
  })

  it('Box (3 digits) pays 100 for the Pick 3 digits in any order', () => {
    expect(prize('box', '274')).toBe(100)
    expect(prize('box', '472')).toBe(100)
    expect(prize('box', '477')).toBe(0)
  })

  it('4-digit Straight pays 5000 only for the exact Pick 4', () => {
    expect(prize('straight', '1905')).toBe(5000)
    expect(prize('straight', '5091')).toBe(0)
  })

  it('Palé (4 digits) pays 1100 for 1st+2nd or 1st+3rd and 100 for 2nd+3rd', () => {
    expect(prize('pale', '7219')).toBe(1100)
    expect(prize('pale', '7205')).toBe(1100)
    expect(prize('pale', '1905')).toBe(100)
    expect(prize('pale', '0519')).toBe(0)
  })

  it('a bet type that does not match the digit count never pays', () => {
    expect(prize('single', '72')).toBe(0)
    expect(prize('box', '1905')).toBe(0)
  })
})

describe('getMaxMultiplier / getBetDraw', () => {
  it('uses the best possible payout for Potential Win', () => {
    expect(getMaxMultiplier(bet('directo', '72'))).toBe(56)
    expect(getMaxMultiplier(bet('straight', '472'))).toBe(600)
    expect(getMaxMultiplier(bet('straight', '1905'))).toBe(5000)
    expect(getMaxMultiplier(bet('pale', '7219'))).toBe(1100)
  })

  it('reports which draw decides each bet', () => {
    expect(getBetDraw(bet('single', '7'))).toBe('pick3')
    expect(getBetDraw(bet('straight', '472'))).toBe('pick3')
    expect(getBetDraw(bet('straight', '1905'))).toBe('pick4')
    expect(getBetDraw(bet('directo', '72'))).toBe('both')
    expect(getBetDraw(bet('pale', '7219'))).toBe('both')
  })
})

describe('primera / segunda / tercera', () => {
  it('sale de los últimos 2 del Pick 3 y los primeros y últimos 2 del Pick 4', () => {
    // Ejemplo de la tabla de jugadas: Numbers 915 + Win 4 4328 -> 15 / 43 / 28.
    expect(getDirectoPrizes('915', '4328')).toEqual({ first: '15', second: '43', third: '28' })
    expect(getDirectoPrizes(PICK3, PICK4)).toEqual({ first: '72', second: '19', third: '05' })
  })
})
