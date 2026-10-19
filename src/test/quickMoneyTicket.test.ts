import { describe, expect, it } from 'vitest'
import { toQuickMoneyTicketBet } from '../api/quickMoneyTicket'

// The backend (internal/tickets) takes the same bet type codes and the digits as a string, in the
// order they were entered -- leading zeros included.
describe('toQuickMoneyTicketBet', () => {
  it('sends the bet type and the digits in order', () => {
    expect(toQuickMoneyTicketBet({ betType: 'straight', digits: [0, 7, 2] }, 25)).toEqual({
      betType: 'straight',
      selection: '072',
      amount: 25,
    })
  })

  it('handles every digit count', () => {
    expect(toQuickMoneyTicketBet({ betType: 'single', digits: [0] }, 1).selection).toBe('0')
    expect(toQuickMoneyTicketBet({ betType: 'directo', digits: [1, 9] }, 1).selection).toBe('19')
    expect(toQuickMoneyTicketBet({ betType: 'pale', digits: [7, 2, 0, 5] }, 1).selection).toBe('7205')
  })
})
