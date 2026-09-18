import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../../../utils/currencyFormat'
import type { GameEventPayoutRow } from '../../../types/adminGameEvents'
import './gameEventDetail.css'

interface GameEventPayoutsTabProps {
  payouts: GameEventPayoutRow[]
}

// Reutiliza formatCurrency (utils/currencyFormat.ts, ya usado por RTP Simulator) para los montos --
// no existe todavía un componente/tabla de payouts reutilizable en el proyecto (ver investigación:
// el sidebar item "Payouts" sigue disabled), así que la tabla en sí es nueva pero el formatter no.
export function GameEventPayoutsTab({ payouts }: GameEventPayoutsTabProps) {
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
              <th>{t('admin.gameEvents.payouts.table.player')}</th>
              <th>{t('admin.gameEvents.payouts.table.bet')}</th>
              <th>{t('admin.gameEvents.payouts.table.payout')}</th>
              <th>{t('admin.gameEvents.payouts.table.status')}</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((row) => (
              <tr key={row.id}>
                <td className="admin-game-events-payouts-player">{row.player}</td>
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
    </div>
  )
}
