import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PlannedRound, ProgrammingSummary } from '../../../types/adminProgramming'
import { SCHEDULE_TIME_ZONE, scheduleClock, scheduleDay } from '../../../utils/programmingTime'

// How many days the list shows before "Show all".
const COLLAPSED_DAYS = 2

interface UpcomingRoundsPanelProps {
  rounds: PlannedRound[]
  summary: ProgrammingSummary
  // true: the rounds are a preview of unsaved changes.
  preview: boolean
  loading: boolean
}

function statusKey(round: PlannedRound): string {
  if (round.action !== 'keep') return round.action
  if (round.estado === 'programado') return 'scheduled'
  if (round.estado === 'congelado') return 'closed'
  return 'open'
}

// The rounds of both games up to the horizon, by day: the ones that exist, and what a pending change
// would create, update or remove -- plus the roulette times skipped because of a Quick Money draw.
// Nothing about the bets on them (the Admin never sees what is being bet on open rounds).
export function UpcomingRoundsPanel({ rounds, summary, preview, loading }: UpcomingRoundsPanelProps) {
  const { t, i18n } = useTranslation()
  const [showAll, setShowAll] = useState(false)

  const days = useMemo(() => {
    const byDay = new Map<string, PlannedRound[]>()
    for (const round of rounds) {
      const day = scheduleDay(round.drawAt)
      byDay.set(day, [...(byDay.get(day) ?? []), round])
    }
    return [...byDay.entries()]
  }, [rounds])
  const dayLabel = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', timeZone: SCHEDULE_TIME_ZONE }),
    [i18n.language],
  )
  const visible = showAll ? days : days.slice(0, COLLAPSED_DAYS)
  const chips: { key: keyof ProgrammingSummary; show: boolean }[] = [
    { key: 'create', show: summary.create > 0 },
    { key: 'update', show: summary.update > 0 },
    { key: 'cancel', show: summary.cancel > 0 },
    { key: 'blocked', show: summary.blocked > 0 },
    { key: 'skip', show: summary.skip > 0 },
  ]

  return (
    <section className="admin-panel admin-settings-card admin-programming-rounds" aria-busy={loading}>
      <div className="admin-panel-header">
        <div>
          <h2 className="admin-panel-title">{t(preview ? 'admin.programming.rounds.previewTitle' : 'admin.programming.rounds.title')}</h2>
          <p className="admin-settings-card-subtitle">
            {t(preview ? 'admin.programming.rounds.previewSubtitle' : 'admin.programming.rounds.subtitle')}
          </p>
        </div>
        <ul className="admin-programming-summary">
          {chips
            .filter((c) => c.show)
            .map((c) => (
              <li key={c.key} data-action={c.key}>
                {t(`admin.programming.rounds.summary.${c.key}`, { count: summary[c.key] })}
              </li>
            ))}
        </ul>
      </div>

      {days.length === 0 && <p className="admin-settings-notice">{t('admin.programming.rounds.none')}</p>}

      {visible.map(([day, dayRounds]) => (
        <div key={day} className="admin-programming-day">
          <h3 className="admin-programming-day-title">{dayLabel.format(new Date(`${day}T12:00:00-04:00`))}</h3>
          <table className="admin-programming-table">
            <thead>
              <tr>
                <th scope="col">{t('admin.programming.rounds.columns.time')}</th>
                <th scope="col">{t('admin.programming.rounds.columns.game')}</th>
                <th scope="col">{t('admin.programming.rounds.columns.round')}</th>
                <th scope="col">{t('admin.programming.rounds.columns.bettingCloses')}</th>
                <th scope="col">{t('admin.programming.rounds.columns.resultChangeUntil')}</th>
                <th scope="col">{t('admin.programming.rounds.columns.status')}</th>
              </tr>
            </thead>
            <tbody>
              {dayRounds.map((round) => {
                const skipped = round.action === 'skip'
                return (
                  <tr key={`${round.juego}-${round.drawAt}`} data-action={round.action}>
                    <td className="admin-programming-time-cell">{scheduleClock(round.drawAt)}</td>
                    <td>
                      <span className="admin-programming-game" data-game={round.juego}>
                        {t(round.juego === 'lottery' ? 'admin.programming.quickMoney.title' : 'admin.programming.roulette.title')}
                      </span>
                    </td>
                    <td>{round.drawNo ? `#${round.drawNo}` : '—'}</td>
                    <td>{skipped ? '—' : scheduleClock(round.bettingClosesAt, true)}</td>
                    <td>{skipped ? '—' : scheduleClock(round.resultChangeUntil, true)}</td>
                    <td>
                      <span className="admin-programming-status" data-action={round.action}>
                        {skipped && round.skippedFor
                          ? t('admin.programming.rounds.status.skipFor', { time: scheduleClock(round.skippedFor) })
                          : t(`admin.programming.rounds.status.${statusKey(round)}`)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}

      {days.length > COLLAPSED_DAYS && (
        <button type="button" className="admin-settings-btn admin-settings-btn--ghost admin-programming-show-all" onClick={() => setShowAll((v) => !v)}>
          {showAll ? t('admin.programming.rounds.showLess') : t('admin.programming.rounds.showAll', { count: days.length })}
        </button>
      )}
    </section>
  )
}
