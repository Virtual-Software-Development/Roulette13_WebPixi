import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../../../utils/currencyFormat'
import type { GameEventPayoutRow } from '../../../types/adminGameEvents'
import './gameEventDetail.css'

interface GameEventPayoutsTabProps {
  payouts: GameEventPayoutRow[]
  // Total de tickets ganadores de la ronda -- el backend manda como mucho 100 filas.
  totalWinningTickets: number
}

// Tickets ganadores de una ronda ya sorteada (los tickets son anónimos: no hay jugadores). El
// código llega enmascarado desde el backend: completo alcanza para cobrar el premio.
export function GameEventPayoutsTab({ payouts, totalWinningTickets }: GameEventPayoutsTabProps) {
  const { t } = useTranslation()

  if (payouts.length === 0) {
    return (
      <div className="admin-game-events-overview-panel">
        <p className="admin-game-events-result-caption">{t('admin.gameEvents.payouts.empty')}</p>
      </div>
    )
  }

  return (
    <div className="admin-game-events-overview-panel">
      <div className="admin-game-events-payouts-scroll">
        <table className="admin-game-events-payouts-table">
          <thead>
            <tr>
              <th>{t('admin.gameEvents.payouts.table.ticket')}</th>
              <th>{t('admin.gameEvents.payouts.table.machine')}</th>
              <th>{t('admin.gameEvents.payouts.table.bet')}</th>
              <th>{t('admin.gameEvents.payouts.table.payout')}</th>
              <th>{t('admin.gameEvents.payouts.table.status')}</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((row) => (
              <tr key={row.id}>
                <td className="admin-game-events-payouts-player">{row.ticket}</td>
                <td>{row.machine}</td>
                <td className="admin-game-events-payouts-amount">{formatCurrency(row.betAmount)}</td>
                <td className="admin-game-events-payouts-amount">{formatCurrency(row.payoutAmount)}</td>
                <td>
                  <span className="admin-game-events-payout-status" data-status={row.status}>
                    {t(`admin.gameEvents.payouts.status.${row.status}`)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalWinningTickets > payouts.length && (
        <p className="admin-game-events-result-caption">
          {t('admin.gameEvents.payouts.truncated', { shown: payouts.length, total: totalWinningTickets })}
        </p>
      )}
    </div>
  )
}
