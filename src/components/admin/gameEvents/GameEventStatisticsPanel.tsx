import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../StatusBadge'
import { GAME_EVENT_STATUS_VARIANT } from '../../../data/gameEventBadges'
import { formatCurrency } from '../../../utils/currencyFormat'
import type { GameEventDetail, GameEventStatistics, GameEventStatus } from '../../../types/adminGameEvents'
import './gameEventDetail.css'

interface GameEventStatisticsPanelProps {
  statistics: GameEventStatistics | null
  status: GameEventStatus
  resultMethod: GameEventDetail['resultMethod']
}

// Cifras de la ronda -- el backend solo las manda de rondas ya sorteadas (COMPLETED); las abiertas,
// canceladas o fallidas llegan sin estadísticas. Los tickets son anónimos: no hay "jugadores".
export function GameEventStatisticsPanel({ statistics, status, resultMethod }: GameEventStatisticsPanelProps) {
  const { t, i18n } = useTranslation()
  const count = (value: number) => value.toLocaleString(i18n.language)

  const rows: { key: string; label: string; value: string }[] = statistics
    ? [
        { key: 'tickets', label: t('admin.gameEvents.overview.statistics.tickets'), value: count(statistics.tickets) },
        { key: 'bets', label: t('admin.gameEvents.overview.statistics.totalBets'), value: count(statistics.bets) },
        { key: 'wagered', label: t('admin.gameEvents.overview.statistics.totalWagered'), value: formatCurrency(statistics.wagered) },
        { key: 'paid', label: t('admin.gameEvents.overview.statistics.totalPayout'), value: formatCurrency(statistics.paid) },
        { key: 'ggr', label: t('admin.gameEvents.overview.statistics.ggr'), value: formatCurrency(statistics.ggr) },
        { key: 'winners', label: t('admin.gameEvents.overview.statistics.winningTickets'), value: count(statistics.winningTickets) },
        {
          key: 'rtp',
          label: t('admin.gameEvents.overview.statistics.rtp'),
          value: statistics.rtp === null ? t('admin.gameEvents.metadata.notApplicable') : `${statistics.rtp.toFixed(2)}%`,
        },
      ]
    : []

  return (
    <div className="admin-game-events-statistics">
      <h3 className="admin-game-events-panel-title">{t('admin.gameEvents.overview.statistics.title')}</h3>
      <div className="admin-game-events-stat-rows">
        {rows.map((row) => (
          <div key={row.key} className="admin-game-events-stat-row">
            <span className="admin-game-events-stat-label">{row.label}</span>
            <span className="admin-game-events-stat-value">{row.value}</span>
          </div>
        ))}
        {resultMethod && (
          <div className="admin-game-events-stat-row">
            <span className="admin-game-events-stat-label">{t('admin.gameEvents.overview.statistics.resultMethod')}</span>
            <span className="admin-game-events-stat-value">{t(`admin.gameEvents.resultMethod.${resultMethod}`)}</span>
          </div>
        )}
        <div className="admin-game-events-stat-row">
          <span className="admin-game-events-stat-label">{t('admin.gameEvents.overview.statistics.status')}</span>
          <StatusBadge variant={GAME_EVENT_STATUS_VARIANT[status]}>{t(`admin.gameEvents.status.${status}`)}</StatusBadge>
        </div>
      </div>
      {!statistics && (
        <p className="admin-game-events-result-caption">
          {t(status === 'cancelled' || status === 'failed' ? 'admin.gameEvents.overview.statistics.notDrawn' : 'admin.gameEvents.overview.statistics.empty')}
        </p>
      )}
    </div>
  )
}
