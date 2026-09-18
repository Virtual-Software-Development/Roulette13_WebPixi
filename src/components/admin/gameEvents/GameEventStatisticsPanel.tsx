import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../StatusBadge'
import { GAME_EVENT_STATUS_VARIANT } from '../../../data/adminGameEventsMockData'
import { formatCurrency } from '../../../utils/currencyFormat'
import type { GameEventStatistics, GameEventStatus } from '../../../types/adminGameEvents'
import './gameEventDetail.css'

interface GameEventStatisticsPanelProps {
  statistics: GameEventStatistics | null
  status: GameEventStatus
}

// Solo métricas que realmente existen en el modelo (GameEvent.statistics) -- Total Bets/Total
// Payout/Unique Players, sin agregar nada que no venga del mock/API real.
export function GameEventStatisticsPanel({ statistics, status }: GameEventStatisticsPanelProps) {
  const { t } = useTranslation()

  return (
    <div className="admin-game-events-statistics">
      <h3 className="admin-game-events-panel-title">{t('admin.gameEvents.overview.statistics.title')}</h3>
      {statistics ? (
        <div className="admin-game-events-stat-rows">
          <div className="admin-game-events-stat-row">
            <span className="admin-game-events-stat-label">{t('admin.gameEvents.overview.statistics.totalBets')}</span>
            <span className="admin-game-events-stat-value">{statistics.totalBets.toLocaleString('en-US')}</span>
          </div>
          <div className="admin-game-events-stat-row">
            <span className="admin-game-events-stat-label">{t('admin.gameEvents.overview.statistics.totalPayout')}</span>
            <span className="admin-game-events-stat-value">{formatCurrency(statistics.totalPayout)}</span>
          </div>
          <div className="admin-game-events-stat-row">
            <span className="admin-game-events-stat-label">{t('admin.gameEvents.overview.statistics.uniquePlayers')}</span>
            <span className="admin-game-events-stat-value">{statistics.uniquePlayers.toLocaleString('en-US')}</span>
          </div>
          <div className="admin-game-events-stat-row">
            <span className="admin-game-events-stat-label">{t('admin.gameEvents.overview.statistics.status')}</span>
            <StatusBadge variant={GAME_EVENT_STATUS_VARIANT[status]}>{t(`admin.gameEvents.status.${status}`)}</StatusBadge>
          </div>
        </div>
      ) : (
        <p className="admin-game-events-result-caption">{t('admin.gameEvents.overview.statistics.empty')}</p>
      )}
    </div>
  )
}
