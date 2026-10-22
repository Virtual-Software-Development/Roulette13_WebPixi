import { describe, expect, it } from 'vitest'
import { toTicketBet } from '../api/rouletteTicket'
import { buildRouletteBetZones } from '../utils/rouletteBetZones'
import { calculateBetPayout } from '../utils/rouletteBetPayout'

// Every zone of the real betting board must map to a bet the backend accepts
// (quick-money-backend internal/tickets/api.go): a bet_type code, and for inside bets the covered
// numbers, for outside bets the backend's group name.
const insideCodes: Record<string, number> = { straight: 1, split: 2, street: 3, corner: 4, basket: 5, six_line: 6 }
const outsideValues: Record<string, string[]> = {
  column: ['1', '2', '3'],
  dozen: ['1', '2', '3'],
  red_black: ['red', 'black'],
  even_odd: ['even', 'odd'],
  low_high: ['low', 'high'],
}

describe('toTicketBet', () => {
  const zones = buildRouletteBetZones('american')

  it('maps every board zone to a backend bet', () => {
    for (const zone of zones) {
      const bet = toTicketBet(zone.selection, 5)
      expect(bet.amount).toBe(5)
      if (bet.betType in insideCodes) {
        const numbers = bet.selection.split(',')
        expect(numbers).toHaveLength(insideCodes[bet.betType])
        expect(numbers.sort()).toEqual(zone.selection.pockets.map(String).sort())
      } else {
        expect(outsideValues[bet.betType], `${zone.id} -> ${bet.betType}`).toContain(bet.selection)
      }
    }
  })

  it('names columns and dozens the way the backend settles them', () => {
    const outside = (id: string) => {
      const zone = zones.find((z) => z.id === id)
      if (!zone) throw new Error(`no zone ${id}`)
      return toTicketBet(zone.selection, 1)
    }
    // Backend: column "1" = numbers whose remainder by 3 is 1 (1, 4, 7 ... 34); dozen "1" = 1-12.
    for (const zone of zones.filter((z) => z.selection.type === 'column')) {
      const bet = toTicketBet(zone.selection, 1)
      const remainders = new Set(zone.selection.pockets.map((n) => Number(n) % 3))
      expect(remainders.size).toBe(1)
      const r = [...remainders][0]
      expect(bet.selection).toBe(r === 0 ? '3' : String(r))
    }
    expect(outside('dozen:firstDozen').selection).toBe('1')
    expect(outside('dozen:thirdDozen').selection).toBe('3')
    expect(outside('redBlack:red')).toMatchObject({ betType: 'red_black', selection: 'red' })
    expect(outside('highLow:high')).toMatchObject({ betType: 'low_high', selection: 'high' })
    expect(outside('oddEven:even')).toMatchObject({ betType: 'even_odd', selection: 'even' })
  })

  it('has the basket (0, 00, 1, 2, 3) on the American board only, paid 6:1', () => {
    const baskets = zones.filter((z) => z.selection.type === 'basket')
    expect(baskets).toHaveLength(1)
    expect(toTicketBet(baskets[0].selection, 2)).toEqual({ betType: 'basket', selection: '0,00,1,2,3', amount: 2 })
    expect(calculateBetPayout('basket', 2)).toEqual({ totalReturn: 14, profit: 12 })
    expect(buildRouletteBetZones('european').some((z) => z.selection.type === 'basket')).toBe(false)
  })

  it('sends 00 as "00"', () => {
    const zone = zones.find((z) => z.selection.type === 'straightUp' && z.selection.pockets[0] === '00')
    expect(zone).toBeDefined()
    expect(toTicketBet(zone!.selection, 1)).toMatchObject({ betType: 'straight', selection: '00' })
  })
})
