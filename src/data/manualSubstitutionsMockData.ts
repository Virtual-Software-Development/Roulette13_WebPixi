import { formatDayMonth } from '../utils/reportFormat'
import { comparisonPeriod, periodDays, type ReportPeriod } from '../utils/reportPeriod'
import { ADMIN_USERS } from './adminUsersMockData'
import { dayKey, hashSeed, seededRandom } from './mockRandom'
import type { ManualSubstitutionsDay, ManualSubstitutionsOperatorRow, ManualSubstitutionsReportData, ManualSubstitutionsTotals } from '../types/adminReports'

// Mock TEMPORAL del reporte de Manual Substitutions -- mismo criterio que adminReportsMockData.ts:
// no existe todavía un endpoint que agregue el log de auditoría (system_events 'manual_result'),
// y el backend hoy no guarda el número original ni el nuevo (sin eso no se puede calcular el
// impacto real en RTP). Los números se generan por día con semilla fija (fecha + operador), así
// cambiar el rango de fechas da cifras estables y coherentes entre sí.

// Una ronda de ruleta por minuto (game_schedule_config.intervalo_segundos = 60 en el seed).
const ROUNDS_PER_DAY = 24 * 60

// Cuánto anula cada operador relativo al resto (el primero es el más activo). El último
// "operador" son las sustituciones sin sesión. Por debajo de 0.2 el operador nunca llegaría a 1
// anulación por día (ver simulateOperatorDay).
const ACTIVITY_FACTORS = [1, 0.7, 0.45, 0.3, 0.25]
const NO_SESSION_FACTOR = 0.25
const MAX_ANNULMENTS_PER_DAY = 4

interface MockOperator {
  id: string
  fullName: string | null
  username: string | null
  factor: number
}

// Solo admin/operator pueden sustituir (viewer es solo lectura).
const MOCK_OPERATORS: MockOperator[] = [
  ...ADMIN_USERS.filter((user) => user.role !== 'viewer').map((user, i) => ({
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    factor: ACTIVITY_FACTORS[i] ?? ACTIVITY_FACTORS[ACTIVITY_FACTORS.length - 1],
  })),
  { id: 'no-session', fullName: null, username: null, factor: NO_SESSION_FACTOR },
]

interface OperatorDay {
  annulments: number
  rtpImpactPp: number
  lastAt: Date | null
}

// `now` evita horas futuras en el día de hoy (la última anulación no puede ser más tarde que ahora).
function simulateOperatorDay(date: Date, operatorIndex: number, factor: number, now: Date): OperatorDay {
  const random = seededRandom(hashSeed(dayKey(date), operatorIndex))
  const annulments = Math.floor(random() * (MAX_ANNULMENTS_PER_DAY + 1) * factor)
  let rtpImpactPp = 0
  const isToday = dayKey(date) === dayKey(now)
  const maxHour = isToday ? now.getHours() : 23
  let lastHour = -1
  for (let i = 0; i < annulments; i++) {
    lastHour = Math.max(lastHour, Math.floor(random() * (maxHour + 1)))
    // Sesgado hacia negativo: en general se cambia el resultado para bajar lo que paga la ronda.
    rtpImpactPp += -0.045 + random() * 0.06
  }
  const maxMinute = isToday && lastHour === maxHour ? now.getMinutes() + 1 : 60
  const lastAt = annulments > 0 ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), lastHour, Math.floor(random() * maxMinute)) : null
  return { annulments, rtpImpactPp, lastAt }
}

// Rondas jugadas ese día -- hoy solo hasta ahora.
function roundsOn(date: Date, now: Date): number {
  return dayKey(date) === dayKey(now) ? now.getHours() * 60 + now.getMinutes() : ROUNDS_PER_DAY
}

function toTotals(events: number, annulments: number, rtpImpactPp: number): ManualSubstitutionsTotals {
  return { events, annulments, annulmentRate: events > 0 ? (annulments / events) * 100 : 0, rtpImpactPp }
}

function summarizePeriod(
  period: ReportPeriod,
  now: Date,
): { days: ManualSubstitutionsDay[]; operators: ManualSubstitutionsOperatorRow[]; totals: ManualSubstitutionsTotals } {
  const operatorAcc = MOCK_OPERATORS.map(() => ({ annulments: 0, rtpImpactPp: 0, lastAt: null as Date | null }))
  let cumulative = 0

  const days = periodDays(period).map((date) => {
    let annulments = 0
    let rtpImpactPp = 0
    MOCK_OPERATORS.forEach((operator, i) => {
      const day = simulateOperatorDay(date, i, operator.factor, now)
      annulments += day.annulments
      rtpImpactPp += day.rtpImpactPp
      const acc = operatorAcc[i]
      acc.annulments += day.annulments
      acc.rtpImpactPp += day.rtpImpactPp
      if (day.lastAt) acc.lastAt = day.lastAt
    })
    cumulative += rtpImpactPp
    return { label: formatDayMonth(date), events: roundsOn(date, now), annulments, rtpImpactPp, cumulativeRtpImpactPp: cumulative }
  })

  const totals = toTotals(
    days.reduce((sum, d) => sum + d.events, 0),
    days.reduce((sum, d) => sum + d.annulments, 0),
    cumulative,
  )

  const operators: ManualSubstitutionsOperatorRow[] = MOCK_OPERATORS.map((operator, i) => {
    const acc = operatorAcc[i]
    return {
      id: operator.id,
      fullName: operator.fullName,
      username: operator.username,
      annulments: acc.annulments,
      shareOfAnnulments: totals.annulments > 0 ? (acc.annulments / totals.annulments) * 100 : 0,
      rtpImpactPp: acc.rtpImpactPp,
      lastSubstitutionAt: acc.lastAt,
    }
  })
    .filter((row) => row.annulments > 0)
    .sort((a, b) => b.annulments - a.annulments)

  return { days, operators, totals }
}

export function buildManualSubstitutionsReport(period: ReportPeriod, now: Date): ManualSubstitutionsReportData {
  const current = summarizePeriod(period, now)
  // Período anterior de igual duración, inmediatamente antes -- para el "vs. período anterior".
  const previous = summarizePeriod(comparisonPeriod(period, 'range'), now)
  return { ...current, previousTotals: previous.totals }
}
