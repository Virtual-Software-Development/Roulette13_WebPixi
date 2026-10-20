import type {
  ReportActivity,
  ReportData,
  ReportGame,
  ReportGameData,
  ReportMachinesData,
  ReportRounds,
  ReportRtpData,
  ReportSubstitution,
  ReportUnpaidPrizes,
} from '../types/adminReports'
import { addDays, periodDays, toIsoDate, type ReportPeriod } from '../utils/reportPeriod'

// Datos de prueba con la forma que devuelve api/adminReports.ts (cifras fijas por día y juego, así
// los totales se pueden verificar a mano).

const GAMES: ReportGame[] = ['roulette', 'quickMoney']

// Día n del período (0, 1, …): ruleta 10 + n rondas, Quick Money 4 + n sorteos.
export function fixtureActivity(period: ReportPeriod): ReportActivity {
  const days = periodDays(period).flatMap((date, n) =>
    GAMES.map((game) => {
      const factor = game === 'roulette' ? 1 : 0.5
      const tickets = (5 + n) * factor
      return {
        date: toIsoDate(date),
        game,
        rounds: game === 'roulette' ? 10 + n : 4 + n,
        tickets,
        bets: tickets * 2,
        sales: tickets * 100,
        prizes: tickets * 90,
      }
    }),
  )
  const hours = GAMES.flatMap((game) => [
    { weekday: 0, hour: 10, game, tickets: 3, sales: 300 },
    { weekday: 4, hour: 21, game, tickets: 2, sales: 150 },
  ])
  return { days, hours }
}

export function fixtureGame(): ReportGameData {
  return {
    betTypes: [
      { game: 'roulette', code: 'straight', digits: 1, name: 'Straight Up', bets: 10, amount: 100, prizes: 72, theoreticalRtp: 94.74 },
      { game: 'roulette', code: 'red_black', digits: 18, name: 'Red / Black', bets: 5, amount: 50, prizes: 40, theoreticalRtp: 94.74 },
      { game: 'quickMoney', code: 'single', digits: 1, name: 'Single', bets: 8, amount: 16, prizes: 18, theoreticalRtp: null },
      { game: 'quickMoney', code: 'straight', digits: 3, name: 'Straight', bets: 2, amount: 20, prizes: 0, theoreticalRtp: null },
      { game: 'quickMoney', code: 'straight', digits: 4, name: 'Straight', bets: 1, amount: 10, prizes: 0, theoreticalRtp: null },
      { game: 'quickMoney', code: 'pale', digits: 4, name: 'Palé', bets: 1, amount: 10, prizes: 0, theoreticalRtp: null },
    ],
    rouletteRounds: 38,
    rouletteFrequency: ['0', '00', ...Array.from({ length: 36 }, (_, i) => String(i + 1))].map((slot) => ({ slot, count: 1 })),
    digits: {
      draws: 10,
      pick3: Array.from({ length: 3 }, () => Array<number>(10).fill(1)),
      pick4: Array.from({ length: 4 }, () => Array<number>(10).fill(1)),
    },
    topNumbers: [
      { number: '47', betTypes: ['bolita', 'directo'], bets: 4, amount: 40 },
      { number: '1905', betTypes: ['straight'], bets: 1, amount: 10 },
    ],
  }
}

export function fixtureRounds(period: ReportPeriod, game: ReportGame, perDay: number): ReportRounds {
  const items = periodDays(period)
    .flatMap((day) =>
      Array.from({ length: perDay }, (_, k) => ({
        id: `${game}-${toIsoDate(day)}-${k}`,
        code: `${game === 'roulette' ? 'RLT' : 'QM'}-${toIsoDate(day).replace(/-/g, '')}-${String(k + 1).padStart(4, '0')}`,
        at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, k),
        result: game === 'roulette' ? String(k % 37) : '472 · 1905',
        manual: k === 0,
        user: k === 0 ? 'John Doe' : null,
        tickets: 1,
        bets: 2,
        amount: 10,
        prizes: k % 2 === 0 ? 0 : 18,
      })),
    )
    .reverse()
  return { items, truncated: false }
}

export function fixtureMachines(): ReportMachinesData {
  const org = (id: string, name: string) => ({ id, name })
  const c1 = org('1', 'Consorcio Cibao')
  const c2 = org('2', 'Consorcio Capital')
  const machines = [
    { id: '1', name: 'SC-01', isActive: true, banca: org('1', 'Banca Santiago'), consorcio: c1 },
    { id: '2', name: 'SC-02', isActive: true, banca: org('1', 'Banca Santiago'), consorcio: c1 },
    { id: '3', name: 'LV-01', isActive: true, banca: org('2', 'Banca La Vega'), consorcio: c1 },
    { id: '4', name: 'NA-01', isActive: true, banca: org('3', 'Banca Naco'), consorcio: c2 },
    { id: '5', name: 'NA-02', isActive: true, banca: org('3', 'Banca Naco'), consorcio: c2 },
  ]
  const lastSaleAt = new Date(2026, 9, 11, 20, 15)
  const totals = ['1', '2', '3', '4'].flatMap((machineId, i) =>
    GAMES.map((game) => ({ machineId, game, tickets: 10 + i, sales: 1000 + i * 100, prizes: 900, lastSaleAt, paid: 800, pending: 50, expired: 10 })),
  )
  return {
    machines,
    totals,
    amountRanges: [
      { game: 'roulette', index: 0, tickets: 30 },
      { game: 'roulette', index: 1, tickets: 12 },
      { game: 'quickMoney', index: 0, tickets: 40 },
      { game: 'quickMoney', index: 4, tickets: 1 },
    ],
  }
}

export function fixtureUnpaidPrizes(period: ReportPeriod): ReportUnpaidPrizes {
  const ticket = (code: string, game: ReportGame, days: number) => ({
    code,
    game,
    round: game === 'roulette' ? 'RLT-20261010-0007' : 'QM-20261010-0003',
    soldAt: new Date(2026, 9, 10, 9, 56),
    prize: 360,
    expiresAt: addDays(period.end, days),
  })
  return {
    cutoff: addDays(period.end, 1),
    pending: { count: 2, amount: 720, items: [ticket('••••••CA0001', 'roulette', 3), ticket('••••••CA0002', 'quickMoney', 20)], truncated: false },
    expired: { count: 1, amount: 360, items: [ticket('••••••CA0003', 'roulette', -2)], truncated: false },
  }
}

export function fixtureRtp(period: ReportPeriod): ReportRtpData {
  const days = periodDays(period)
  return {
    games: GAMES.map((game) => ({ game, target: 94.74, minBand: 92, maxBand: 98 })),
    targets: days.flatMap((date, n) => GAMES.map((game) => ({ date: toIsoDate(date), game, target: n < 2 ? 94.74 : 95 }))),
    changes: days.length > 2 ? [{ at: new Date(days[2].getFullYear(), days[2].getMonth(), days[2].getDate(), 9, 30), game: 'roulette', user: 'John Doe', from: 94.74, to: 95 }] : [],
  }
}

// Dos sustituciones por día: una de ruleta con sesión (bajó lo pagado) y una de Quick Money sin
// sesión (subió lo pagado).
export function fixtureSubstitutions(period: ReportPeriod): ReportSubstitution[] {
  return periodDays(period).flatMap((day) => [
    {
      round: `RLT-${toIsoDate(day).replace(/-/g, '')}-0011`,
      game: 'roulette' as const,
      roundAt: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 20),
      at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 19),
      user: { username: 'jdoe', fullName: 'John Doe' },
      originalResult: '4',
      newResult: '12',
      reason: 'Cambio manual desde Next Results',
      paidOriginal: 225,
      paidNew: 0,
    },
    {
      round: `QM-${toIsoDate(day).replace(/-/g, '')}-0005`,
      game: 'quickMoney' as const,
      roundAt: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 16, 35),
      at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 16, 34),
      user: null,
      originalResult: '013 · 0088',
      newResult: '123 · 4567',
      reason: 'prueba',
      paidOriginal: 0,
      paidNew: 50,
    },
  ])
}

// Todo lo que puede pedir un reporte, para el período y su comparación.
export function fixtureReportData(period: ReportPeriod, previous: ReportPeriod): ReportData {
  return {
    activity: fixtureActivity(period),
    previousActivity: fixtureActivity(previous),
    game: fixtureGame(),
    rounds: { roulette: fixtureRounds(period, 'roulette', 24), quickMoney: fixtureRounds(period, 'quickMoney', 6) },
    machines: fixtureMachines(),
    unpaidPrizes: fixtureUnpaidPrizes(period),
    rtp: fixtureRtp(period),
    substitutions: fixtureSubstitutions(period),
    previousSubstitutions: fixtureSubstitutions(previous),
  }
}
