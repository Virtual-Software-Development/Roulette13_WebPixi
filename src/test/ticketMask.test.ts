import { describe, expect, it } from 'vitest'
import { maskTicketCode } from '../utils/ticketMask'

// Same cases as the backend's internal/ticketmask: both sides must mask a code identically, so a
// machine recognises its own ticket in the masked winners list.
describe('maskTicketCode', () => {
  it('shows only the last 6 letters/digits, upper case, after 6 bullets', () => {
    expect(maskTicketCode('TMVGU2X26YNA4')).toBe('••••••26YNA4')
    expect(maskTicketCode('ABCDEFGHJKMN')).toBe('••••••GHJKMN')
    expect(maskTicketCode('QM-9225422B')).toBe('••••••25422B')
    expect(maskTicketCode('tk-2026-1016-abcd12')).toBe('••••••ABCD12')
  })

  it("doesn't reveal the code's length or show a short code", () => {
    expect(maskTicketCode('ABCDEFGH')).toHaveLength(12)
    expect(maskTicketCode('T-1234-5678-9ABC-DEFG')).toHaveLength(12)
    expect(maskTicketCode('ABCDEF')).toBe('••••••')
    expect(maskTicketCode('')).toBe('••••••')
  })
})
