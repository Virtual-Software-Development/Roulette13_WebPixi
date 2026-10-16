import { describe, expect, it } from 'vitest'
import { toTicketBet } from '../api/rouletteTicket'
import { buildRouletteBetZones } from '../utils/rouletteBetZones'

// Every zone of the real betting board must map to a bet the backend accepts
// (quick-money-backend internal/tickets/roulette.go): a known code, and for inside bets the
// covered numbers, for outside bets the backend's group name.
const insideCodes: Record<string, number> = { pleno: 1, caballo: 2, calle: 3, esquina: 4, linea: 6 }
const outsideValues: Record<string, string[]> = {
  columna: ['1', '2', '3'],
  docena: ['1', '2', '3'],
  color: ['rojo', 'negro'],
  paridad: ['par', 'impar'],
  altura: ['falta', 'pasa'],
}

describe('toTicketBet', () => {
  const zones = buildRouletteBetZones('american')

  it('maps every board zone to a backend bet', () => {
    for (const zone of zones) {
      const bet = toTicketBet(zone.selection, 5)
      expect(bet.montoApostado).toBe(5)
      if (bet.tipoApuesta in insideCodes) {
        const numbers = bet.valor.split(',')
        expect(numbers).toHaveLength(insideCodes[bet.tipoApuesta])
        expect(numbers.sort()).toEqual(zone.selection.pockets.map(String).sort())
      } else {
        expect(outsideValues[bet.tipoApuesta], `${zone.id} -> ${bet.tipoApuesta}`).toContain(bet.valor)
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
      expect(bet.valor).toBe(r === 0 ? '3' : String(r))
    }
    expect(outside('dozen:firstDozen').valor).toBe('1')
    expect(outside('dozen:thirdDozen').valor).toBe('3')
    expect(outside('redBlack:red')).toMatchObject({ tipoApuesta: 'color', valor: 'rojo' })
    expect(outside('highLow:high')).toMatchObject({ tipoApuesta: 'altura', valor: 'pasa' })
    expect(outside('oddEven:even')).toMatchObject({ tipoApuesta: 'paridad', valor: 'par' })
  })

  it('sends 00 as "00"', () => {
    const zone = zones.find((z) => z.selection.type === 'straightUp' && z.selection.pockets[0] === '00')
    expect(zone).toBeDefined()
    expect(toTicketBet(zone!.selection, 1)).toMatchObject({ tipoApuesta: 'pleno', valor: '00' })
  })
})
