import { useTranslation } from 'react-i18next'
import type { RecentRound } from '../../types/adminDashboard'
import './recentRoundsPanel.css'

const GAME_LABEL_KEY: Record<RecentRound['game'], string> = {
  roulette: 'admin.dashboard.gamesActivity.roulette',
  pick3: 'admin.dashboard.gamesActivity.pick3',
  pick4: 'admin.dashboard.gamesActivity.pick4',
}

// The API uses 37 to represent the '00' pocket (same convention as the root game app's
// src/utils/rouletteColors.ts) -- translated to the '00' label here only so a real result doesn't
// display as the wrong number; tone/layout are unchanged from the original design otherwise.
function rouletteResultLabel(value: number): string {
  return value === 37 ? '00' : String(value)
}

function ResultPills({ round }: { round: RecentRound }) {
  if (round.game === 'roulette') {
    const [value] = round.result
    return (
      <span className="admin-round-pill" data-tone={value === 0 || value === 37 ? 'green' : 'red'}>
        {rouletteResultLabel(value)}
      </span>
    )
  }

  const tone = round.game === 'pick3' ? 'blue' : 'purple'
  return (
    <span className="admin-round-pill-group">
      {round.result.map((value, i) => (
        <span key={i} className="admin-round-pill" data-tone={tone}>
          {value}
        </span>
      ))}
    </span>
  )
}

export function RecentRoundsPanel({ rounds }: { rounds: RecentRound[] }) {
  const { t } = useTranslation()

  return (
    <section className="admin-panel admin-recent-rounds">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">{t('admin.dashboard.recentRounds.title')}</h2>
      </div>

      <table className="admin-recent-rounds-table">
        <thead>
          <tr>
            <th>{t('admin.dashboard.recentRounds.time')}</th>
            <th>{t('admin.dashboard.recentRounds.game')}</th>
            <th>{t('admin.dashboard.recentRounds.result')}</th>
            <th>{t('admin.dashboard.recentRounds.roundNumber')}</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((round) => (
            <tr key={round.id}>
              <td className="admin-recent-rounds-time">{round.time}</td>
              <td>
                <span className={`admin-recent-rounds-game admin-recent-rounds-game--${round.game}`}>
                  {t(GAME_LABEL_KEY[round.game])}
                </span>
              </td>
              <td>
                <ResultPills round={round} />
              </td>
              <td className="admin-recent-rounds-number">{round.roundNumber}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
