import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProgrammingGame } from '../../../types/adminProgramming'
import { addTime, everyHours, formatDuration, isClock } from '../../../utils/programmingTime'
import { DurationField } from './DurationField'

interface GameScheduleCardProps {
  title: string
  subtitle: string
  game: ProgrammingGame
  // Quick fills offered for the times (e.g. roulette: every 1, 2, 3 or 4 hours).
  everyHoursOptions?: number[]
  onChange: (game: ProgrammingGame) => void
}

// One game's schedule: on/off, the times of the day it is drawn, when betting closes and until when
// the result can be changed (both before the draw).
export function GameScheduleCard({ title, subtitle, game, everyHoursOptions = [], onChange }: GameScheduleCardProps) {
  const { t } = useTranslation()
  const [newTime, setNewTime] = useState('')
  const edit = (patch: Partial<ProgrammingGame>) => onChange({ ...game, ...patch })
  const canAdd = isClock(newTime) && !game.dailyTimes.includes(newTime)
  const changeAfterClose = game.bettingCloseSeconds - game.resultChangeSeconds

  const add = () => {
    if (!canAdd) return
    edit({ dailyTimes: addTime(game.dailyTimes, newTime) })
    setNewTime('')
  }

  return (
    <section className="admin-panel admin-settings-card admin-programming-card">
      <div className="admin-panel-header admin-programming-card-header">
        <div>
          <h2 className="admin-panel-title">{title}</h2>
          <p className="admin-settings-card-subtitle">{subtitle}</p>
        </div>
        <div className="admin-settings-toggle-row">
          <label className="admin-settings-toggle">
            <input
              type="checkbox"
              className="admin-settings-toggle-input"
              checked={game.isActive}
              onChange={() => edit({ isActive: !game.isActive })}
            />
            <span className="admin-settings-toggle-track">
              <span className="admin-settings-toggle-thumb" />
            </span>
          </label>
          <p className="admin-settings-toggle-label">{t(game.isActive ? 'admin.programming.active' : 'admin.programming.paused')}</p>
        </div>
      </div>

      <div className="admin-programming-times">
        <p className="admin-programming-label">{t('admin.programming.times.label', { count: game.dailyTimes.length })}</p>
        <ul className="admin-programming-time-list" aria-label={t('admin.programming.times.label', { count: game.dailyTimes.length })}>
          {game.dailyTimes.map((time) => (
            <li key={time} className="admin-programming-time-chip">
              {time}
              <button
                type="button"
                aria-label={t('admin.programming.times.remove', { time })}
                onClick={() => edit({ dailyTimes: game.dailyTimes.filter((x) => x !== time) })}
              >
                ×
              </button>
            </li>
          ))}
          {game.dailyTimes.length === 0 && <li className="admin-programming-time-empty">{t('admin.programming.times.none')}</li>}
        </ul>
        <div className="admin-programming-time-add">
          <input
            type="time"
            step={60}
            value={newTime}
            aria-label={t('admin.programming.times.new')}
            onChange={(e) => setNewTime(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add()
            }}
          />
          <button type="button" className="admin-settings-btn admin-settings-btn--ghost" disabled={!canAdd} onClick={add}>
            {t('admin.programming.times.add')}
          </button>
          {everyHoursOptions.length > 0 && (
            <div className="admin-programming-quick-fill" role="group" aria-label={t('admin.programming.times.quickFill')}>
              <span>{t('admin.programming.times.quickFill')}</span>
              {everyHoursOptions.map((hours) => (
                <button key={hours} type="button" className="admin-programming-quick-fill-btn" onClick={() => edit({ dailyTimes: everyHours(hours) })}>
                  {t('admin.programming.times.everyHours', { count: hours })}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="admin-settings-row admin-programming-cutoffs">
        <DurationField
          label={t('admin.programming.bettingClose.label')}
          hint={t('admin.programming.bettingClose.hint')}
          seconds={game.bettingCloseSeconds}
          onChange={(seconds) => edit({ bettingCloseSeconds: seconds })}
        />
        <DurationField
          label={t('admin.programming.resultChange.label')}
          hint={
            changeAfterClose > 0
              ? t('admin.programming.resultChange.hint', { duration: formatDuration(changeAfterClose) })
              : t('admin.programming.resultChange.hintInvalid')
          }
          seconds={game.resultChangeSeconds}
          onChange={(seconds) => edit({ resultChangeSeconds: seconds })}
        />
      </div>
    </section>
  )
}
