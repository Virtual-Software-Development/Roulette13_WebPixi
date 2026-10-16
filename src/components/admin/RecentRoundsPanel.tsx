import { useTranslation } from 'react-i18next'
import { parseApiDateTime } from '../../utils/time'
import type { RecentRound } from '../../types/adminDashboard'
import './recentRoundsPanel.css'

const TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const GAME_LABEL_KEY: Record<RecentRound['game'], string> = {
  roulette: 'admin.dashboard.gamesActivity.roulette',
  quickMoney: 'admin.dashboard.gamesActivity.quickMoney',
}

function DigitPills({ digits }: { digits: number[] }) {
  return (
    <span className="admin-round-pill-group">
      {digits.map((value, i) => (
        <span key={i} className="admin-round-pill" data-tone="white">
          {value}
        </span>
      ))}
    </span>
  )
}

function ResultPills({ round }: { round: RecentRound }) {
  if (round.game === 'roulette') {
    return (
      <span className="admin-round-pill" data-tone={round.result === '0' || round.result === '00' ? 'green' : 'red'}>
        {round.result}
      </span>
    )
  }

  // Quick Money: Pick 3 y Pick 4 del mismo sorteo, pelotas blancas con letras negras (pedido
  // explícito) -- el color de marca queda solo en el nombre del juego, columna GAME.
  return (
    <span className="admin-round-draw">
      <DigitPills digits={round.result.pick3} />
      <span className="admin-round-draw-separator" aria-hidden="true">·</span>
      <DigitPills digits={round.result.pick4} />
    </span>
  )
}

// Últimas rondas ya sorteadas (GET /rounds?status=COMPLETED) -- nunca la ronda en curso.
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
              <td className="admin-recent-rounds-time">{TIME_FORMATTER.format(parseApiDateTime(round.time))}</td>
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
      {rounds.length === 0 && <p className="admin-recent-rounds-empty">{t('admin.dashboard.recentRounds.empty')}</p>}
    </section>
  )
}
